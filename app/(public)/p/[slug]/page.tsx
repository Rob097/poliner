import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createPublicClient } from "@/lib/supabase/public";
import { SLUG_REGEX } from "@/lib/utils/slug";
import { trovaRazza } from "@/lib/data/razze";
import { curiositaPerPagina } from "@/lib/data/curiosita-razze";
import {
  PaginaPubblicaView,
  type AnimalePubblico,
  type PollaioPubblico,
  type StatsPubbliche,
  type RazzaChip,
  type StatsAnagrafica,
} from "./PaginaPubblicaView";

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
        "id, nome, foto_url, razza_id, razza_custom, data_nascita, tipo, colore_piumaggio, descrizione_pubblica",
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
    descrizionePubblica: a.descrizione_pubblica,
  }));

  const stat = statsRes.data?.[0];
  const stats: StatsPubbliche = {
    uovaTotali: Number(stat?.uova_totali ?? 0),
    uovaUltimoMese: Number(stat?.uova_ultimo_mese ?? 0),
    gallineCount: Number(stat?.galline_count ?? 0),
  };

  // Razze rappresentate (solo galline e galli vivi).
  const razzeMap = new Map<string, RazzaChip>();
  for (const a of animali) {
    const razza = trovaRazza(a.razzaId);
    if (razza && razza.id !== "mista") {
      const prev = razzeMap.get(razza.id);
      razzeMap.set(razza.id, {
        key: razza.id,
        nome: razza.nome,
        count: (prev?.count ?? 0) + 1,
      });
    } else {
      const nomeCustom = a.razzaCustom?.trim();
      if (nomeCustom) {
        const k = `custom:${nomeCustom.toLowerCase()}`;
        const prev = razzeMap.get(k);
        razzeMap.set(k, {
          key: k,
          nome: nomeCustom,
          count: (prev?.count ?? 0) + 1,
        });
      }
    }
  }
  const razzeChips = Array.from(razzeMap.values()).sort(
    (a, b) => b.count - a.count || a.nome.localeCompare(b.nome, "it"),
  );

  // Età media + capostipite (solo animali con data_nascita).
  const oggi = new Date();
  const conData = animali.filter((a) => !!a.dataNascita);
  let etaMediaMesi: number | null = null;
  let capostipiteId: string | null = null;
  let capostipiteEtaMesi: number | null = null;
  if (conData.length > 0) {
    let sommaMesi = 0;
    for (const a of conData) {
      const nascita = new Date(a.dataNascita!);
      const mesi = Math.floor(
        (oggi.getTime() - nascita.getTime()) / (1000 * 60 * 60 * 24 * 30.44),
      );
      sommaMesi += mesi;
      if (capostipiteEtaMesi === null || mesi > capostipiteEtaMesi) {
        capostipiteEtaMesi = mesi;
        capostipiteId = a.id;
      }
    }
    etaMediaMesi = Math.round(sommaMesi / conData.length);
  }
  const capostipite = capostipiteId
    ? animali.find((a) => a.id === capostipiteId) ?? null
    : null;

  const anagrafica: StatsAnagrafica = {
    etaMediaMesi,
    capostipiteNome: capostipite?.nome ?? null,
    capostipiteEtaMesi,
  };

  // Curiosità "sapevi che…"
  const curiosita = curiositaPerPagina({
    slug: params.slug,
    razzeIds: animali.map((a) => a.razzaId),
  });

  return (
    <PaginaPubblicaView
      pollaio={pollaio}
      animali={animali}
      stats={stats}
      razzeChips={razzeChips}
      anagrafica={anagrafica}
      curiosita={curiosita.testo}
    />
  );
}

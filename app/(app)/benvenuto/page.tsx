import { redirect } from "next/navigation";
import { requirePollaio } from "@/lib/supabase/queries";
import { BenvenutoClient } from "./BenvenutoClient";

export const dynamic = "force-dynamic";

interface SearchParams {
  pollaio?: string;
}

export default async function BenvenutoPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const { pollaio, ruolo, pollaiConRuolo } = await requirePollaio();

  // Se il pollaio attivo non corrisponde a quello in querystring (es. arrivo
  // da un invito appena accettato), prova a usare quello in URL se è tra i miei.
  const targetId = resolvedSearchParams.pollaio ?? pollaio.id;
  const target = pollaiConRuolo.find((p) => p.pollaio.id === targetId);

  if (!target) {
    redirect("/");
  }

  return (
    <BenvenutoClient
      pollaioNome={target.pollaio.nome}
      ruolo={target.ruolo === "admin" ? "admin" : "guest"}
      isStessoCheAttivo={targetId === pollaio.id}
      attualeRuolo={ruolo}
    />
  );
}

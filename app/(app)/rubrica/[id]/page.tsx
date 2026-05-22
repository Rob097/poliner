import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminPollaio } from "@/lib/supabase/queries";
import { Header } from "@/components/ui/Header";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatNumber } from "@/components/ui/StatNumber";
import { ContattoActions } from "./ContattoActions";
import { avatarBgFor } from "@/lib/utils/avatar";
import { formatData, formatDataLunga } from "@/lib/utils/date";

export const dynamic = "force-dynamic";

export default async function ContattoDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { supabase, pollaio } = await requireAdminPollaio();

  const { data: contatto } = await supabase
    .from("contatti")
    .select("*")
    .eq("id", params.id)
    .eq("pollaio_id", pollaio.id)
    .maybeSingle();

  if (!contatto) notFound();

  const { data: regali } = await supabase
    .from("regali")
    .select("id, quantita, data, note")
    .eq("contatto_id", contatto.id)
    .order("data", { ascending: false });

  const totale = (regali ?? []).reduce((acc, r) => acc + r.quantita, 0);
  const volte = (regali ?? []).length;
  const ultimaData = regali?.[0]?.data ?? null;

  return (
    <ScreenContainer
      header={(
        <Header
          title={contatto.nome}
          subtitle={contatto.relazione ?? undefined}
        />
      )}
    >
        <Card className="text-center" style={{ background: `${avatarBgFor(contatto.id)}33` }}>
          <div className="flex justify-center mb-3">
            <Avatar name={contatto.nome} size={72} bg={avatarBgFor(contatto.id)} />
          </div>
          <div className="font-serif text-xl font-bold">{contatto.nome}</div>
          {contatto.relazione && (
            <div className="text-sm text-[var(--text-secondary)] mt-0.5">
              {contatto.relazione}
            </div>
          )}

          <div className="flex justify-center gap-6 mt-4 pt-4 border-t border-[var(--border)]">
            <StatNumber value={totale} label="uova ricevute" color="var(--primary)" small />
            <StatNumber value={volte} label={volte === 1 ? "volta" : "volte"} small />
          </div>

          <div className="flex gap-2 mt-4 justify-center">
            {contatto.telefono && (
              <a href={`tel:${contatto.telefono}`}>
                <Button variant="secondary">📞 Chiama</Button>
              </a>
            )}
            <Link href="/uova/regala">
              <Button>🎁 Regala uova</Button>
            </Link>
          </div>
        </Card>

        {contatto.telefono && (
          <Card className="mt-3 flex items-center gap-3">
            <span className="text-xl">📞</span>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] text-[var(--text-secondary)]">Telefono</div>
              <a
                href={`tel:${contatto.telefono}`}
                className="text-sm font-semibold"
              >
                {contatto.telefono}
              </a>
            </div>
          </Card>
        )}

        {contatto.note && (
          <Card className="mt-2">
            <div className="text-[11px] text-[var(--text-secondary)] mb-1">Note</div>
            <p className="text-sm m-0 whitespace-pre-wrap">{contatto.note}</p>
          </Card>
        )}

        <SectionTitle>Storico regali</SectionTitle>
        {!regali || regali.length === 0 ? (
          <EmptyState
            icon="🎁"
            title="Nessun regalo ancora"
            subtitle="I regali fatti a questa persona appariranno qui."
          />
        ) : (
          <div className="flex flex-col gap-1.5">
            {regali.map((r) => (
              <Card key={r.id} className="flex items-center gap-3 py-2.5 px-3.5">
                <span className="text-xl">🎁</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold">
                    {r.quantita} uova
                  </div>
                  <div className="text-xs text-[var(--text-secondary)]">
                    {formatDataLunga(r.data)}
                    {r.note ? ` · ${r.note}` : ""}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {ultimaData && (
          <p className="text-center text-xs text-[var(--text-secondary)] mt-4">
            Ultimo regalo: {formatData(ultimaData)}
          </p>
        )}

        <ContattoActions contatto={{
          id: contatto.id,
          nome: contatto.nome,
          relazione: contatto.relazione,
          telefono: contatto.telefono,
          note: contatto.note,
        }} />
    </ScreenContainer>
  );
}

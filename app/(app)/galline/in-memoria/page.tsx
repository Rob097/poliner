import Link from "next/link";
import { requireAdminPollaio } from "@/lib/supabase/queries";
import { Header } from "@/components/ui/Header";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Avatar } from "@/components/ui/Avatar";
import { avatarBgFor, defaultEmojiFor } from "@/lib/utils/avatar";
import { calcolaEta } from "@/lib/utils/eta";
import { trovaRazza } from "@/lib/data/razze";
import { formatDataLunga } from "@/lib/utils/date";

export const dynamic = "force-dynamic";

export default async function GallineInMemoriaPage() {
  const { supabase, pollaio } = await requireAdminPollaio();

  const { data: animali } = await supabase
    .from("animali")
    .select(
      "id, nome, tipo, razza_id, razza_custom, data_nascita, foto_url, defunta_il, causa_decesso",
    )
    .eq("pollaio_id", pollaio.id)
    .not("defunta_il", "is", null)
    .order("defunta_il", { ascending: false });

  const lista = animali ?? [];

  return (
    <ScreenContainer
      header={(
        <Header
          title="In memoria"
          subtitle={`${lista.length} ${lista.length === 1 ? "ricordata" : "ricordate"}`}
        />
      )}
    >
        {lista.length === 0 ? (
          <EmptyState
            icon="🤍"
            title="Nessuna in memoria"
            subtitle="Le galline che hai segnato come defunte appariranno qui, con tutto il loro storico."
          />
        ) : (
          <div className="flex flex-col gap-2">
            {lista.map((a) => {
              const tipo = a.tipo as "gallina" | "gallo";
              const razza = trovaRazza(a.razza_id);
              const razzaNome = razza?.nome ?? a.razza_custom ?? "Razza non specificata";
              const vissuta = a.data_nascita && a.defunta_il
                ? calcolaEta(a.data_nascita, new Date(a.defunta_il))
                : null;
              return (
                <Link key={a.id} href={`/galline/${a.id}`} className="block">
                  <Card className="flex items-center gap-3">
                    <div style={{ filter: "grayscale(0.6)" }}>
                      <Avatar
                        size={52}
                        src={a.foto_url ?? undefined}
                        emoji={!a.foto_url ? defaultEmojiFor(tipo) : undefined}
                        bg={avatarBgFor(a.id)}
                        name={a.nome}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-[15px] flex items-center gap-1.5">
                        <span aria-hidden>💔</span>
                        <span className="truncate">{a.nome}</span>
                      </div>
                      <div className="text-xs text-[var(--text-secondary)] truncate">
                        {razzaNome}
                      </div>
                      <div className="text-xs text-[var(--text-secondary)] mt-0.5">
                        {a.defunta_il ? `Defunta ${formatDataLunga(a.defunta_il)}` : ""}
                        {vissuta ? ` · Vissuta ${vissuta}` : ""}
                      </div>
                      {a.causa_decesso && (
                        <div className="text-xs text-[var(--text-secondary)] mt-0.5 italic truncate">
                          {a.causa_decesso}
                        </div>
                      )}
                    </div>
                    <span className="text-[var(--text-secondary)]" aria-hidden>›</span>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
    </ScreenContainer>
  );
}

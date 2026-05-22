"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { LoadMoreButton } from "@/components/ui/LoadMoreButton";
import { usePagination } from "@/lib/hooks/usePagination";
import { avatarBgFor, defaultEmojiFor } from "@/lib/utils/avatar";
import { calcolaEta } from "@/lib/utils/eta";
import { trovaRazza } from "@/lib/data/razze";
import { formatDataLunga } from "@/lib/utils/date";

export interface InMemoriaItem {
  id: string;
  nome: string;
  tipo: string;
  razza_id: string | null;
  razza_custom: string | null;
  data_nascita: string | null;
  foto_url: string | null;
  defunta_il: string | null;
  causa_decesso: string | null;
}

export function InMemoriaList({ items }: { items: InMemoriaItem[] }) {
  const { visible, hasMore, remaining, loadMore } = usePagination(items);

  return (
    <>
      <div className="flex flex-col gap-2">
        {visible.map((a) => {
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
                  <div className="text-xs text-(--text-secondary) truncate">
                    {razzaNome}
                  </div>
                  <div className="text-xs text-(--text-secondary) mt-0.5">
                    {a.defunta_il ? `Defunta ${formatDataLunga(a.defunta_il)}` : ""}
                    {vissuta ? ` · Vissuta ${vissuta}` : ""}
                  </div>
                  {a.causa_decesso && (
                    <div className="text-xs text-(--text-secondary) mt-0.5 italic truncate">
                      {a.causa_decesso}
                    </div>
                  )}
                </div>
                <span className="text-(--text-secondary)" aria-hidden>›</span>
              </Card>
            </Link>
          );
        })}
      </div>
      {hasMore && <LoadMoreButton onClick={loadMore} remaining={remaining} />}
    </>
  );
}

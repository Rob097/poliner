"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadMoreButton } from "@/components/ui/LoadMoreButton";
import { usePagination } from "@/lib/hooks/usePagination";
import { etichettaGiornoRelativo, formatData } from "@/lib/utils/date";
import { segnaNotificaComeLetta, segnaTutteComeLette } from "./actions";

export interface NotificaItem {
  id: string;
  categoria: string;
  riferimento_id: string;
  inviata_il: string;
  letta_il: string | null;
}

export interface CategoriaMeta {
  label: string;
  icona: string;
  color: string;
  hrefFn?: (riferimentoId: string) => string;
}

interface Props {
  items: NotificaItem[];
  unreadCount: number;
  meta: Record<string, CategoriaMeta>;
}

export function NotificheList({ items, unreadCount, meta }: Props) {
  const { visible, hasMore, remaining, loadMore } = usePagination(items);

  const grouped = useMemo(() => {
    const m = new Map<string, NotificaItem[]>();
    for (const n of visible) {
      const key = n.inviata_il.slice(0, 10);
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(n);
    }
    return Array.from(m.entries());
  }, [visible]);

  return (
    <>
      {unreadCount > 0 && (
        <form action={segnaTutteComeLette} className="flex justify-end mb-3">
          <Button type="submit" variant="secondary" size="md" className="text-xs px-3 py-2">
            Segna tutte come lette
          </Button>
        </form>
      )}

      {grouped.map(([date, group]) => (
        <div key={date}>
          <div className="text-[13px] font-bold text-(--text-secondary) mt-4 mb-2">
            {etichettaGiornoRelativo(date)} · {formatData(date)}
          </div>
          <div className="flex flex-col gap-1.5">
            {group.map((n) => {
              const m = meta[n.categoria] ?? {
                label: n.categoria,
                icona: "🔔",
                color: "#F0EDE8",
              };
              const href = m.hrefFn?.(n.riferimento_id) ?? null;
              const isUnread = n.letta_il === null;

              return (
                <Card
                  key={n.id}
                  className="flex items-center gap-3 py-2.5 px-3.5"
                  style={{
                    background: isUnread ? "#FFF7DD" : undefined,
                    borderColor: isUnread ? "#FFE07A66" : undefined,
                  }}
                >
                  <span
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0"
                    style={{ background: `${m.color}44` }}
                  >
                    {m.icona}
                  </span>
                  <div className="flex-1 min-w-0">
                    {href ? (
                      <Link href={href} className="block">
                        <div className="font-semibold text-sm flex items-center gap-2">
                          <span>{m.label}</span>
                          {isUnread && (
                            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-(--primary)" />
                          )}
                        </div>
                        <div className="text-xs text-(--text-secondary)">
                          {new Date(n.inviata_il).toLocaleTimeString("it-IT", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </Link>
                    ) : (
                      <>
                        <div className="font-semibold text-sm flex items-center gap-2">
                          <span>{m.label}</span>
                          {isUnread && (
                            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-(--primary)" />
                          )}
                        </div>
                        <div className="text-xs text-(--text-secondary)">
                          {new Date(n.inviata_il).toLocaleTimeString("it-IT", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </>
                    )}
                  </div>
                  {isUnread ? (
                    <form action={segnaNotificaComeLetta} className="shrink-0">
                      <input type="hidden" name="id" value={n.id} />
                      <Button
                        type="submit"
                        variant="icon"
                        aria-label="Segna come letta"
                        className="text-(--primary) text-lg"
                      >
                        ✓
                      </Button>
                    </form>
                  ) : (
                    <span className="text-xs font-semibold text-(--text-secondary) shrink-0">
                      Letta
                    </span>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      ))}

      {hasMore && <LoadMoreButton onClick={loadMore} remaining={remaining} />}

      {!hasMore && items.length > 0 && (
        <p className="text-center text-xs text-(--text-secondary) mt-6 italic">
          Mostriamo solo gli ultimi {items.length} avvisi degli ultimi 30 giorni.
        </p>
      )}
    </>
  );
}

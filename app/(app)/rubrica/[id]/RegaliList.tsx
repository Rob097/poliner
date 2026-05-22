"use client";

import { Card } from "@/components/ui/Card";
import { LoadMoreButton } from "@/components/ui/LoadMoreButton";
import { usePagination } from "@/lib/hooks/usePagination";
import { formatDataLunga } from "@/lib/utils/date";

export interface RegaloItem {
  id: string;
  quantita: number;
  data: string;
  note: string | null;
}

export function RegaliList({ items }: { items: RegaloItem[] }) {
  const { visible, hasMore, remaining, loadMore } = usePagination(items);

  return (
    <>
      <div className="flex flex-col gap-1.5">
        {visible.map((r) => (
          <Card key={r.id} className="flex items-center gap-3 py-2.5 px-3.5">
            <span className="text-xl">🎁</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold">
                {r.quantita} uova
              </div>
              <div className="text-xs text-(--text-secondary)">
                {formatDataLunga(r.data)}
                {r.note ? ` · ${r.note}` : ""}
              </div>
            </div>
          </Card>
        ))}
      </div>
      {hasMore && <LoadMoreButton onClick={loadMore} remaining={remaining} />}
    </>
  );
}

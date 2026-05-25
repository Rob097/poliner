"use client";

import Link from "next/link";

export interface ConversationCardItem {
  id: string;
  titolo: string;
  ultimo_messaggio_at: string;
}

interface Props {
  item: ConversationCardItem;
}

function formatRelativeIt(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / (1000 * 60));
  if (diffMin < 1) return "ora";
  if (diffMin < 60) return `${diffMin} min fa`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH} h fa`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return "ieri";
  if (diffD < 7) return `${diffD} giorni fa`;
  return d.toLocaleDateString("it-IT", {
    day: "numeric",
    month: "short",
  });
}

export function ConversationCard({ item }: Props) {
  return (
    <Link
      href={`/chat/${item.id}`}
      className="flex items-center gap-3 bg-white border border-(--border) rounded-2xl px-4 py-3 hover:bg-(--surface-alt) transition-colors"
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
        style={{ background: "#E0F2FE" }}
        aria-hidden
      >
        ✨
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[15px] font-semibold text-text truncate">
          {item.titolo}
        </div>
        <div className="text-[12px] text-(--text-secondary) mt-0.5">
          {formatRelativeIt(item.ultimo_messaggio_at)}
        </div>
      </div>
    </Link>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";
import { IconEdit, IconTrash } from "@/components/ui/icons";

export interface ConversationCardItem {
  id: string;
  titolo: string;
  ultimo_messaggio_at: string;
}

interface Props {
  item: ConversationCardItem;
  onRename: (id: string, currentTitle: string) => void;
  onDelete: (id: string) => void;
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
  return d.toLocaleDateString("it-IT", { day: "numeric", month: "short" });
}

export function ConversationCard({ item, onRename, onDelete }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);

  function stopAll(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  return (
    <div className="relative">
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
        <button
          type="button"
          aria-label="Menu conversazione"
          onClick={(e) => {
            stopAll(e);
            setMenuOpen((v) => !v);
          }}
          className="w-8 h-8 rounded-full flex items-center justify-center text-text-secondary hover:bg-(--surface-alt) shrink-0"
        >
          <span className="text-xl leading-none">⋯</span>
        </button>
      </Link>

      {menuOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-20 cursor-default"
            onClick={(e) => {
              stopAll(e);
              setMenuOpen(false);
            }}
            aria-label="Chiudi menu"
          />
          <div className="absolute right-2 top-full mt-1 z-30 bg-white border border-(--border) rounded-xl shadow-lg overflow-hidden min-w-[180px]">
            <button
              type="button"
              onClick={(e) => {
                stopAll(e);
                setMenuOpen(false);
                onRename(item.id, item.titolo);
              }}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-(--surface-alt) text-[14px]"
            >
              <IconEdit size={16} /> Rinomina
            </button>
            <button
              type="button"
              onClick={(e) => {
                stopAll(e);
                setMenuOpen(false);
                onDelete(item.id);
              }}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-(--surface-alt) text-[14px]"
              style={{ color: "#C0392B" }}
            >
              <IconTrash size={16} /> Elimina
            </button>
          </div>
        </>
      )}
    </div>
  );
}

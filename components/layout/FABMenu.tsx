"use client";

import { useRouter } from "next/navigation";
import { IconClose } from "@/components/ui/icons";
import type { RuoloPollaio } from "@/lib/supabase/queries";

interface FABMenuProps {
  ruolo: RuoloPollaio;
  open: boolean;
  onClose: () => void;
}

interface Action {
  id: string;
  label: string;
  icon: string;
  bg: string;
  onClick: () => void;
}

export function FABMenu({ ruolo, open, onClose }: FABMenuProps) {
  const router = useRouter();

  if (!open) return null;

  function go(href: string) {
    router.push(href);
    onClose();
  }

  const actions: Action[] = ruolo === "admin"
    ? [
        {
          id: "add-egg",
          label: "Aggiungi uova",
          icon: "🥚",
          bg: "#FFE4D0",
          onClick: () => go("/uova/nuovo"),
        },
        {
          id: "go-manutenzione",
          label: "Manutenzione",
          icon: "🧹",
          bg: "#B5D4B5",
          onClick: () => go("/manutenzione"),
        },
        {
          id: "add-note",
          label: "Nota rapida",
          icon: "📝",
          bg: "#E8DAFF",
          onClick: () => go("/note?nuova=1"),
        },
      ]
    : [
        {
          id: "ask-eggs",
          label: "Richiedi uova in regalo",
          icon: "🙏",
          bg: "#FFD6E0",
          onClick: () => go("/uova?richiedi=1"),
        },
      ];

  return (
    <div
      className="fixed inset-0 z-100 bg-[rgba(46,41,36,0.4)] flex flex-col justify-end items-center animate-fade-in"
      style={{ paddingBottom: "calc(80px + env(safe-area-inset-bottom, 0px))" }}
      onClick={onClose}
    >
      <div className="flex flex-col gap-2.5 mb-4" onClick={(e) => e.stopPropagation()}>
        {actions.map((action, i) => (
          <button
            key={action.id}
            type="button"
            onClick={action.onClick}
            className="flex items-center gap-3 px-5 py-3 bg-white border-none rounded-2xl cursor-pointer font-sans text-[15px] font-semibold text-text shadow-[0_4px_16px_rgba(0,0,0,0.1)] animate-slide-up"
            style={{ animationDelay: `${i * 60}ms`, animationFillMode: "backwards" }}
          >
            <span
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
              style={{ background: action.bg }}
            >
              {action.icon}
            </span>
            <span>{action.label}</span>
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Chiudi menu"
        className="w-[52px] h-[52px] rounded-full bg-text border-none cursor-pointer flex items-center justify-center shadow-[0_4px_16px_rgba(0,0,0,0.2)] mt-2"
      >
        <IconClose size={24} color="#fff" />
      </button>
    </div>
  );
}

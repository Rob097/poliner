"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { IconClose } from "@/components/ui/icons";
import { quickAddPuliziaCasetta } from "@/lib/actions/quick";

interface FABMenuProps {
  open: boolean;
  onClose: () => void;
  onAddCleaning?: (ok: boolean) => void;
}

interface Action {
  id: string;
  label: string;
  icon: string;
  bg: string;
  onClick: () => void;
}

export function FABMenu({ open, onClose, onAddCleaning }: FABMenuProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  // Tutte le hooks DEVONO essere chiamate prima di qualsiasi return.
  if (!open) return null;

  const actions: Action[] = [
    {
      id: "add-egg",
      label: "Aggiungi uovo",
      icon: "🥚",
      bg: "#FFE4D0",
      onClick: () => {
        router.push("/uova/nuovo");
        onClose();
      },
    },
    {
      id: "add-cleaning",
      label: "Segnala pulizia casetta",
      icon: "🧹",
      bg: "#B5D4B5",
      onClick: () => {
        startTransition(async () => {
          const res = await quickAddPuliziaCasetta();
          onAddCleaning?.(res.ok);
          router.refresh();
        });
        onClose();
      },
    },
    {
      id: "add-note",
      label: "Nota rapida",
      icon: "📝",
      bg: "#E8DAFF",
      onClick: () => {
        router.push("/note?nuova=1");
        onClose();
      },
    },
  ];

  return (
    <div
      className="fixed inset-0 z-[100] bg-[rgba(46,41,36,0.4)] flex flex-col justify-end items-center animate-fade-in"
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

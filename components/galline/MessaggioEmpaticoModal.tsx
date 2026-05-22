"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/Button";

interface Props {
  nome: string;
  onClose: () => void;
}

const FRASI = [
  (n: string) => `Mi dispiace tanto per ${n}. Sarà sempre parte del tuo pollaio. 🤍`,
  (n: string) => `${n} ha avuto una bella vita con te. Custodirò il suo ricordo nello storico.`,
  (n: string) => `Un abbraccio. ${n} resterà nei dati e nei ricordi del pollaio.`,
  (n: string) => `Grazie a te ${n} è stata amata. Non andrà persa: il suo storico resta intatto.`,
];

export function MessaggioEmpaticoModal({ nome, onClose }: Props) {
  const [mounted, setMounted] = useState(false);
  const frase = useMemo(() => FRASI[Math.floor(Math.random() * FRASI.length)](nome), [nome]);

  useEffect(() => {
    setMounted(true);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!mounted) return null;

  const node = (
    <div
      className="fixed inset-0 bg-[rgba(46,41,36,0.55)] backdrop-blur-xs z-210 flex items-center justify-center px-6 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl w-full max-w-app px-6 py-8 text-center shadow-xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-5xl mb-3" aria-hidden>🤍</div>
        <div className="font-serif text-2xl font-bold mb-3">{nome}</div>
        <p className="text-[15px] text-text leading-relaxed m-0 mb-6 whitespace-pre-line">
          {frase}
        </p>
        <Button onClick={onClose} fullWidth size="lg">
          Chiudi
        </Button>
      </div>
    </div>
  );

  return createPortal(node, document.body);
}

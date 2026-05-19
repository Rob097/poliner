"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { IconClose } from "@/components/ui/icons";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "poliner.install.dismissedAt";
const DISMISS_DAYS = 30;

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Se già installata (display-mode: standalone), non mostrare nulla
    if (typeof window === "undefined") return;
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    // Se l'utente l'ha già rifiutato di recente, non mostrare
    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (dismissedAt) {
      const age = Date.now() - Number(dismissedAt);
      if (age < DISMISS_DAYS * 24 * 60 * 60 * 1000) return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function onInstall() {
    if (!deferred) return;
    await deferred.prompt();
    const result = await deferred.userChoice;
    if (result.outcome === "accepted") {
      setShow(false);
      setDeferred(null);
    } else {
      onDismiss();
    }
  }

  function onDismiss() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setShow(false);
  }

  if (!show) return null;

  return (
    <div
      className="absolute left-3 right-3 z-40 animate-slide-up"
      style={{
        bottom: "calc(80px + env(safe-area-inset-bottom, 0px))",
      }}
    >
      <div
        className="bg-white rounded-2xl shadow-toast border border-[var(--border)] p-4 flex items-start gap-3"
      >
        <div className="text-3xl">🐔</div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm">Installa Poliner</div>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">
            Aggiungi l&apos;app alla schermata principale per accedere più velocemente.
          </p>
          <div className="flex gap-2 mt-3">
            <Button size="md" onClick={onInstall} className="text-xs px-3 py-2">
              Installa
            </Button>
            <Button
              variant="text"
              onClick={onDismiss}
              className="text-xs"
            >
              Più tardi
            </Button>
          </div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="text-[var(--text-secondary)] -mt-1"
          aria-label="Chiudi"
        >
          <IconClose size={16} />
        </button>
      </div>
    </div>
  );
}

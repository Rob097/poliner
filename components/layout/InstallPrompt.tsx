"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { IconClose } from "@/components/ui/icons";
import { usePwaInstall } from "./PwaInstallProvider";

const DISMISS_KEY = "poliner.install.dismissedAt";
const DISMISS_DAYS = 30;

export function InstallPrompt() {
  const [show, setShow] = useState(false);
  const { availability, isSafari, requestInstall } = usePwaInstall();
  const isIosManual = availability === "ios-manual";

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (availability === "unavailable") {
      setShow(false);
      return;
    }

    // Se l'utente l'ha già rifiutato di recente, non mostrare
    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (dismissedAt) {
      const age = Date.now() - Number(dismissedAt);
      if (age < DISMISS_DAYS * 24 * 60 * 60 * 1000) {
        setShow(false);
        return;
      }
    }

    setShow(true);
  }, [availability]);

  async function onInstall() {
    const result = await requestInstall();

    if (result === "accepted") {
      setShow(false);
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
      className="fixed left-3 right-3 z-40 animate-slide-up min-[500px]:absolute"
      style={{
        bottom: "calc(80px + env(safe-area-inset-bottom, 0px))",
      }}
    >
      <div
        className="bg-white rounded-2xl shadow-toast border border-[var(--border)] p-4 flex items-start gap-3"
      >
        <div className="text-3xl">🐔</div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm">
            {isIosManual ? "Installa Poliner su iPhone o iPad" : "Installa Poliner"}
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">
            {isIosManual
              ? isSafari
                ? "Su iPhone e iPad l'installazione passa da Safari: tocca Condividi e poi Aggiungi a Home."
                : "Per installare Poliner su iPhone o iPad, apri questa pagina in Safari e poi tocca Condividi e Aggiungi a Home."
              : "Aggiungi l'app alla schermata principale per accedere più velocemente."}
          </p>
          <div className="flex gap-2 mt-3">
            {isIosManual ? (
              <Button size="md" onClick={onDismiss} className="text-xs px-3 py-2">
                Ho capito
              </Button>
            ) : (
              <>
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
              </>
            )}
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

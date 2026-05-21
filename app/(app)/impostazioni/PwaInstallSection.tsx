"use client";

import { useState } from "react";
import { usePwaInstall } from "@/components/layout/PwaInstallProvider";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SectionTitle } from "@/components/ui/SectionTitle";

export function PwaInstallSection() {
  const { availability, isSafari, requestInstall } = usePwaInstall();
  const [pending, setPending] = useState(false);

  if (availability === "unavailable") return null;

  const isIosManual = availability === "ios-manual";
  const manualSteps = isSafari
    ? [
        "Tocca il pulsante Condividi di Safari.",
        "Scegli Aggiungi a Home.",
      ]
    : [
        "Apri Poliner in Safari.",
        "Tocca il pulsante Condividi.",
        "Scegli Aggiungi a Home.",
      ];

  async function onInstall() {
    if (availability !== "native" || pending) return;

    setPending(true);

    try {
      await requestInstall();
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <SectionTitle>Installa l&apos;app</SectionTitle>
      <Card className="flex flex-col gap-3.5">
        <div>
          <div className="font-semibold text-[15px]">
            Aggiungi Poliner alla schermata principale
          </div>
          <p className="text-[13px] text-[var(--text-secondary)] mt-1 mb-0 leading-relaxed">
            {isIosManual
              ? isSafari
                ? "Su iPhone e iPad l'installazione è manuale, ma richiede solo pochi tocchi."
                : "Per installare Poliner su iPhone o iPad, apri prima questa pagina in Safari."
              : "Installa Poliner per aprirla più in fretta e usarla come una vera app."}
          </p>
        </div>

        {isIosManual ? (
          <ol className="m-0 pl-5 text-[13px] text-[var(--text-secondary)] leading-6">
            {manualSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        ) : (
          <Button onClick={onInstall} disabled={pending} className="self-start">
            {pending ? "Apro il prompt..." : "Installa app"}
          </Button>
        )}
      </Card>
    </>
  );
}
"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";

const STORAGE_KEY = "poliner.inserimento.edu.hidden";

const STEP: { titolo: string; icona: string; testo: string }[] = [
  {
    titolo: "Quarantena (~30 giorni)",
    icona: "🔒",
    testo:
      "Tieni la nuova gallina separata per circa 30 giorni. Controlla che non abbia sintomi: occhi che lacrimano, starnuti, parassiti, feci anomale.",
  },
  {
    titolo: "Presentazione visiva (~1 settimana)",
    icona: "👀",
    testo:
      "Metti le due aree affiancate con una rete divisoria. Le galline si vedono ma non si toccano. Aggiungi più mangiatoie e abbeveratoi.",
  },
  {
    titolo: "Convivenza",
    icona: "🏠",
    testo:
      "Inseriscila di notte mentre le altre dormono. Per i primi giorni rimettila tu nel pollaio la sera. Il pecking order si stabilisce in 1-2 settimane.",
  },
];

export function InserimentoEducativo() {
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(true);
  const [openStep, setOpenStep] = useState<number | null>(0);

  useEffect(() => {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "1") setHidden(true);
  }, []);

  if (hidden) return null;

  return (
    <Card
      style={{
        background: "#B5D4B515",
        border: "1px solid #B5D4B544",
      }}
      className="mb-3"
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 text-left"
      >
        <div className="font-semibold text-sm">
          💡 Come inserire una nuova gallina
        </div>
        <span className="text-(--text-secondary) text-xs" aria-hidden>
          {open ? "−" : "+"}
        </span>
      </button>

      {open && (
        <>
          <p className="text-xs text-(--text-secondary) leading-relaxed mt-2 mb-3 m-0">
            Inserire una nuova gallina in un gruppo già formato è un processo
            graduale: dura circa 5-6 settimane. Questi sono i passi consigliati,
            ma puoi documentare il tuo inserimento come preferisci.
          </p>

          <div className="flex flex-col gap-1.5">
            {STEP.map((s, i) => (
              <div key={i} className="rounded-sm border border-(--border) bg-white">
                <button
                  type="button"
                  onClick={() => setOpenStep(openStep === i ? null : i)}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left"
                >
                  <div className="flex items-center gap-2">
                    <span aria-hidden>{s.icona}</span>
                    <span className="text-sm font-semibold">{s.titolo}</span>
                  </div>
                  <span className="text-xs text-(--text-secondary)" aria-hidden>
                    {openStep === i ? "−" : "+"}
                  </span>
                </button>
                {openStep === i && (
                  <p className="text-xs text-(--text-secondary) leading-relaxed m-0 px-3 pb-3">
                    {s.testo}
                  </p>
                )}
              </div>
            ))}
          </div>

          <div
            className="mt-3 px-3 py-2 rounded-sm text-xs"
            style={{ background: "#FFE07A33" }}
          >
            💡 <span className="font-semibold">Suggerimento:</span> non
            introdurre mai una gallina da sola. Meglio almeno 2-3 insieme.
          </div>

          <button
            type="button"
            onClick={() => {
              localStorage.setItem(STORAGE_KEY, "1");
              setHidden(true);
            }}
            className="text-xs text-(--text-secondary) mt-3 underline"
          >
            Ho capito, nascondi
          </button>
        </>
      )}
    </Card>
  );
}

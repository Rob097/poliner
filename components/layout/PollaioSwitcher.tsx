"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { switchPollaio, creaPollaio } from "@/lib/actions/pollaio";
import type { Pollai, RuoloPollaio } from "@/lib/supabase/queries";

interface PollaioConRuolo {
  pollaio: Pollai;
  ruolo: RuoloPollaio;
}

interface PollaioSwitcherProps {
  pollai: PollaioConRuolo[];
  attivoId: string;
  prominent?: boolean;
}

/**
 * Pulsante "subtitle" cliccabile che mostra il nome del pollaio attivo
 * e apre un bottom-sheet con la lista degli altri pollai e il pulsante
 * "Crea nuovo pollaio".
 */
export function PollaioSwitcher({ pollai, attivoId, prominent = false }: PollaioSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [nuovoNome, setNuovoNome] = useState("");
  const [errore, setErrore] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const attivo = pollai.find((p) => p.pollaio.id === attivoId);
  if (!attivo) return null;

  const handleSwitch = (id: string) => {
    if (id === attivoId) {
      setOpen(false);
      return;
    }
    startTransition(async () => {
      const res = await switchPollaio(id);
      if (!res.ok) {
        setErrore(res.error ?? "Errore");
        return;
      }
      setOpen(false);
      router.push(`/benvenuto?pollaio=${id}`);
    });
  };

  const handleCrea = () => {
    setErrore(null);
    startTransition(async () => {
      const res = await creaPollaio({ nome: nuovoNome });
      if (!res.ok || !res.pollaioId) {
        setErrore(res.error ?? "Errore");
        return;
      }
      setNuovoNome("");
      setCreating(false);
      setOpen(false);
      router.push(`/benvenuto?pollaio=${res.pollaioId}`);
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center transition-transform hover:text-text active:scale-95 ${
          prominent
            ? "gap-1.5 text-[19px] font-bold text-text leading-tight"
            : "gap-1 text-[13px] text-(--text-secondary) mt-0.5"
        }`}
        aria-label="Cambia pollaio"
      >
        <span className={prominent ? "truncate max-w-[230px]" : "font-semibold"}>{attivo.pollaio.nome}</span>
        {pollai.length > 1 && (
          <span className={prominent ? "text-[12px] opacity-80 mt-0.5" : "text-[10px] opacity-70 ml-0.5"}>▾</span>
        )}
        {attivo.ruolo === "guest" && (
          <span
            className={prominent
              ? "ml-2 text-[11px] uppercase tracking-wide px-2 py-1 rounded-md bg-(--border) text-(--text-secondary)"
              : "ml-1.5 text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded-md bg-(--border) text-(--text-secondary)"}
          >
            guest
          </span>
        )}
      </button>

      {open && (
        <Modal title="I tuoi pollai" onClose={() => setOpen(false)}>
          <div className="flex flex-col gap-2">
            {pollai.map(({ pollaio, ruolo }) => {
              const isAttivo = pollaio.id === attivoId;
              return (
                <button
                  key={pollaio.id}
                  type="button"
                  onClick={() => handleSwitch(pollaio.id)}
                  disabled={isPending}
                  className={`flex items-center gap-3 px-4 py-3 rounded-sm border-2 text-left transition-colors ${
                    isAttivo
                      ? "border-(--primary) bg-(--primary-lighter)"
                      : "border-(--border) bg-white hover:bg-(--bg-warm)"
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-(--primary-light) flex items-center justify-center text-lg">
                    🏡
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-[15px] truncate">{pollaio.nome}</div>
                    <div className="text-xs text-(--text-secondary)">
                      {ruolo === "admin" ? "Admin" : "Guest"}
                    </div>
                  </div>
                  {isAttivo && (
                    <span className="text-(--primary) text-lg" aria-hidden>
                      ●
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {creating ? (
            <div className="mt-4 flex flex-col gap-2">
              <label className="text-[13px] font-semibold">Nome del nuovo pollaio</label>
              <input
                type="text"
                value={nuovoNome}
                onChange={(e) => setNuovoNome(e.target.value)}
                placeholder="Es. Pollaio della nonna"
                className="px-4 py-3 rounded-sm border-2 border-(--border) text-[15px] bg-white"
                autoFocus
              />
              {errore && <p className="text-(--primary) text-sm">{errore}</p>}
              <div className="flex gap-2 mt-1">
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={() => {
                    setCreating(false);
                    setNuovoNome("");
                    setErrore(null);
                  }}
                  disabled={isPending}
                >
                  Annulla
                </Button>
                <Button
                  fullWidth
                  onClick={handleCrea}
                  disabled={isPending || !nuovoNome.trim()}
                >
                  {isPending ? "Creo…" : "Crea"}
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="secondary"
              fullWidth
              className="mt-4"
              onClick={() => setCreating(true)}
            >
              + Crea nuovo pollaio
            </Button>
          )}

          {errore && !creating && (
            <p className="text-(--primary) text-sm mt-2">{errore}</p>
          )}
        </Modal>
      )}
    </>
  );
}

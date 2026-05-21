"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { registraApertura, registraChiusura } from "@/lib/actions/uscite";

interface Props {
  oraUscita: string | null; // "HH:MM:SS" o null
  oraRientro: string | null;
  alba: string | null; // "HH:MM"
  tramonto: string | null; // "HH:MM"
  isAdmin: boolean;
}

function formatHHMM(time: string | null): string | null {
  if (!time) return null;
  return time.slice(0, 5);
}

export function AperturaChiusuraCard({
  oraUscita,
  oraRientro,
  alba,
  tramonto,
  isAdmin,
}: Props) {
  const router = useRouter();
  const { show } = useToast();
  const [isPending, startTransition] = useTransition();

  const uscitaLabel = formatHHMM(oraUscita);
  const rientroLabel = formatHHMM(oraRientro);

  const aperto = Boolean(uscitaLabel);
  const chiuso = Boolean(rientroLabel);

  const handleApri = () => {
    startTransition(async () => {
      const res = await registraApertura();
      if (res.ok) {
        show("🌅 Aperto!");
        router.refresh();
      } else {
        show(res.error ?? "Ops, riprova!");
      }
    });
  };

  const handleChiudi = () => {
    startTransition(async () => {
      const res = await registraChiusura();
      if (res.ok) {
        show("🌙 Chiuso!");
        router.refresh();
      } else {
        show(res.error ?? "Ops, riprova!");
      }
    });
  };

  // Caso 1: niente registrato oggi
  if (!aperto && !chiuso) {
    return (
      <Card className="bg-[var(--primary-lighter)] border border-[var(--primary-light)]">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🌅</span>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-[15px]">Pollaio chiuso</div>
            {alba && (
              <div className="text-[12px] text-[var(--text-secondary)]">
                Alba alle {alba}
              </div>
            )}
          </div>
          {isAdmin ? (
            <Button onClick={handleApri} disabled={isPending} className="px-4 py-2 text-sm">
              {isPending ? "..." : "Apri ora"}
            </Button>
          ) : (
            <span className="text-xs text-[var(--text-secondary)] italic">in attesa</span>
          )}
        </div>
      </Card>
    );
  }

  // Caso 2: aperto, non ancora chiuso
  if (aperto && !chiuso) {
    return (
      <Card className="bg-[#FFF7DD] border border-[#FFE07A]">
        <div className="flex items-center gap-3">
          <span className="text-3xl">☀️</span>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-[15px]">Aperto alle {uscitaLabel}</div>
            {tramonto && (
              <div className="text-[12px] text-[var(--text-secondary)]">
                Tramonto alle {tramonto}
              </div>
            )}
          </div>
          {isAdmin ? (
            <Button
              onClick={handleChiudi}
              disabled={isPending}
              className="px-4 py-2 text-sm bg-[#2E2924]"
            >
              {isPending ? "..." : "🌙 Chiudo"}
            </Button>
          ) : (
            <span className="text-xs text-[var(--text-secondary)] italic">{tramonto ?? "—"}</span>
          )}
        </div>
      </Card>
    );
  }

  // Caso 3: chiuso senza apertura registrata (raro ma possibile)
  if (!aperto && chiuso) {
    return (
      <Card className="bg-[var(--bg-warm)] border border-[var(--border)]">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🌙</span>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-[15px]">Chiuso alle {rientroLabel}</div>
            <div className="text-[12px] text-[var(--text-secondary)]">
              Apertura di oggi non registrata
            </div>
          </div>
          <Link href="/uscite" className="text-sm text-[var(--primary)] font-semibold">
            Modifica
          </Link>
        </div>
      </Card>
    );
  }

  // Caso 4: entrambi
  return (
    <Card className="bg-[var(--bg-warm)] border border-[var(--border)]">
      <div className="flex items-center gap-3">
        <span className="text-3xl">🐔</span>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-[15px]">
            Aperto {uscitaLabel} · Chiuso {rientroLabel}
          </div>
          <div className="text-[12px] text-[var(--text-secondary)]">
            Giornata completata
          </div>
        </div>
        <Link href="/uscite" className="text-sm text-[var(--primary)] font-semibold">
          Storico
        </Link>
      </div>
    </Card>
  );
}

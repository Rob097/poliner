"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/ui/Header";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { LoadMoreButton } from "@/components/ui/LoadMoreButton";
import { IconPlus } from "@/components/ui/icons";
import { useToast } from "@/components/ui/Toast";
import { usePagination } from "@/lib/hooks/usePagination";
import {
  SospensioneSheet,
  type GallinaOpzione,
} from "@/components/uova/SospensioneSheet";
import {
  hideLoadingOverlay,
  showLoadingOverlay,
} from "@/components/layout/NavigationOverlay";
import { eliminaSospensioneUova } from "@/lib/actions/sospensioni";
import {
  commestibiliDal,
  dalGiorno,
  durataGiorni,
  etichettaRitorno,
  faseSospensione,
  formatPeriodo,
  giorniAlRitorno,
  nomiGalline,
  oggiSospensioni,
  type FaseSospensione,
  type SospensioneUova,
} from "@/lib/utils/sospensioni";

export interface ConteggioUova {
  /** Uova ancora in scorta, non commestibili. */
  bloccate: number;
  /** Uova già scartate. */
  scartate: number;
}

interface Props {
  sospensioni: SospensioneUova[];
  nomi: Record<string, string>;
  galline: GallinaOpzione[];
  conteggi: Record<string, ConteggioUova>;
  isAdmin: boolean;
  apriNuova: boolean;
}

export function SospensioniClient({
  sospensioni,
  nomi,
  galline,
  conteggi,
  isAdmin,
  apriNuova,
}: Props) {
  const router = useRouter();
  const [sheet, setSheet] = useState<{ iniziale?: SospensioneUova } | null>(
    apriNuova ? {} : null,
  );

  const nomiMap = useMemo(() => new Map(Object.entries(nomi)), [nomi]);
  const oggi = oggiSospensioni();

  const perFase = useMemo(() => {
    const gruppi: Record<FaseSospensione, SospensioneUova[]> = {
      in_corso: [],
      programmata: [],
      conclusa: [],
    };
    for (const s of sospensioni) gruppi[faseSospensione(s, oggi)].push(s);
    // In corso: prima quelle che finiscono prima. Programmate: prima le più vicine.
    gruppi.in_corso.sort((a, b) => a.dataFine.localeCompare(b.dataFine));
    gruppi.programmata.sort((a, b) => a.dataInizio.localeCompare(b.dataInizio));
    return gruppi;
  }, [sospensioni, oggi]);

  const concluse = usePagination(perFase.conclusa);
  const inCorso = perFase.in_corso.length;

  return (
    <>
      <ScreenContainer
        header={(
          <Header
            title="Sospensione uova"
            subtitle={
              inCorso > 0
                ? `${inCorso} ${inCorso === 1 ? "sospensione in corso" : "sospensioni in corso"}`
                : "Uova non commestibili dopo un farmaco"
            }
            onBack={() => router.back()}
          />
        )}
      >
        {isAdmin && (
          <Button
            fullWidth
            className="gap-1.5 mb-3"
            onClick={() => setSheet({})}
          >
            <IconPlus size={18} /> Nuova sospensione
          </Button>
        )}

        <details className="mb-1 group">
          <summary className="list-none cursor-pointer flex items-center justify-between px-1 py-2 text-[13px] font-semibold text-(--primary)">
            <span>Cos&apos;è il tempo di sospensione?</span>
            <span className="transition-transform group-open:rotate-90" aria-hidden>
              ›
            </span>
          </summary>
          <Card className="mt-1 text-[13px] text-(--text-secondary) leading-relaxed">
            <p className="m-0">
              Dopo alcuni farmaci (antibiotici, antiparassitari…) nelle uova restano dei residui
              per qualche giorno. Il periodo in cui non vanno mangiate né regalate si chiama{" "}
              <strong className="text-text">tempo di sospensione</strong> (nelle norme
              veterinarie <em>tempo di attesa</em>).
            </p>
            <p className="mt-2 mb-0">
              La durata è scritta nel foglietto del farmaco o te la indica il veterinario, e si
              conta dall&apos;ultima somministrazione. Le uova raccolte nel periodo restano non
              commestibili anche dopo la fine: buttale quando vuoi.
            </p>
          </Card>
        </details>

        {sospensioni.length === 0 ? (
          <EmptyState
            icon="💊"
            title="Nessuna sospensione"
            subtitle="Quando una gallina prende un farmaco, registra qui il periodo in cui le sue uova non sono commestibili."
          />
        ) : (
          <>
            {perFase.in_corso.length > 0 && (
              <>
                <SectionTitle>In corso</SectionTitle>
                <div className="flex flex-col gap-2">
                  {perFase.in_corso.map((s) => (
                    <SospensioneCard
                      key={s.id}
                      s={s}
                      fase="in_corso"
                      oggi={oggi}
                      nomi={nomiMap}
                      conteggio={conteggi[s.id]}
                      isAdmin={isAdmin}
                      onEdit={() => setSheet({ iniziale: s })}
                    />
                  ))}
                </div>
              </>
            )}

            {perFase.programmata.length > 0 && (
              <>
                <SectionTitle>Programmate</SectionTitle>
                <div className="flex flex-col gap-2">
                  {perFase.programmata.map((s) => (
                    <SospensioneCard
                      key={s.id}
                      s={s}
                      fase="programmata"
                      oggi={oggi}
                      nomi={nomiMap}
                      conteggio={conteggi[s.id]}
                      isAdmin={isAdmin}
                      onEdit={() => setSheet({ iniziale: s })}
                    />
                  ))}
                </div>
              </>
            )}

            {perFase.conclusa.length > 0 && (
              <>
                <SectionTitle>Concluse</SectionTitle>
                <div className="flex flex-col gap-2">
                  {concluse.visible.map((s) => (
                    <SospensioneCard
                      key={s.id}
                      s={s}
                      fase="conclusa"
                      oggi={oggi}
                      nomi={nomiMap}
                      conteggio={conteggi[s.id]}
                      isAdmin={isAdmin}
                      onEdit={() => setSheet({ iniziale: s })}
                    />
                  ))}
                </div>
                {concluse.hasMore && (
                  <LoadMoreButton onClick={concluse.loadMore} remaining={concluse.remaining} />
                )}
              </>
            )}
          </>
        )}
      </ScreenContainer>

      {sheet && (
        <SospensioneSheet
          galline={galline}
          iniziale={sheet.iniziale}
          onClose={() => setSheet(null)}
        />
      )}
    </>
  );
}

const FASE_BADGE: Record<FaseSospensione, { label: string; bg: string; color: string }> = {
  in_corso: { label: "In corso", bg: "#FFD6E0", color: "#c0435a" },
  programmata: { label: "Programmata", bg: "#FFE07A55", color: "#7a5d1a" },
  conclusa: { label: "Conclusa", bg: "#B5D4B533", color: "#3d6b3d" },
};

function SospensioneCard({
  s,
  fase,
  oggi,
  nomi,
  conteggio,
  isAdmin,
  onEdit,
}: {
  s: SospensioneUova;
  fase: FaseSospensione;
  oggi: string;
  nomi: Map<string, string>;
  conteggio: ConteggioUova | undefined;
  isAdmin: boolean;
  onEdit: () => void;
}) {
  const router = useRouter();
  const { show } = useToast();
  const [pending, startTransition] = useTransition();
  const badge = FASE_BADGE[fase];
  const giorni = durataGiorni(s.dataInizio, s.dataFine);
  const ritorno = dalGiorno(commestibiliDal(s));

  function onDelete() {
    const ok = window.confirm(
      "Eliminare questa sospensione?\nLe uova ancora in scorta di quel periodo torneranno disponibili.",
    );
    if (!ok) return;
    showLoadingOverlay();
    startTransition(async () => {
      const res = await eliminaSospensioneUova(s.id);
      hideLoadingOverlay();
      if (!res.ok) {
        show(res.error ?? "Ops, riprova!");
        return;
      }
      show("✓ Sospensione eliminata");
      router.refresh();
    });
  }

  return (
    <Card
      style={fase === "in_corso" ? { borderLeft: "4px solid #c0435a" } : undefined}
    >
      <div className="flex justify-between items-start gap-2 mb-1">
        <div className="font-semibold text-sm">
          💊 {s.motivo}
          {s.prodotto && (
            <span className="font-normal text-(--text-secondary)"> · {s.prodotto}</span>
          )}
        </div>
        <Badge small bg={badge.bg} color={badge.color}>
          {badge.label}
        </Badge>
      </div>

      <div className="text-[13px] text-(--text-secondary) leading-relaxed">
        <div>🐔 {nomiGalline(s, nomi)}</div>
        <div>
          📅 {formatPeriodo(s)} · {giorni} {giorni === 1 ? "giorno" : "giorni"}
        </div>
      </div>

      <div
        className="mt-2 px-2.5 py-1.5 rounded-lg text-xs"
        style={{ background: fase === "conclusa" ? "#B5D4B533" : "#FFE07A33" }}
      >
        {fase === "conclusa"
          ? `✅ Uova di nuovo commestibili ${ritorno}`
          : `✅ Di nuovo commestibili ${ritorno} (${etichettaRitorno(giorniAlRitorno(s, oggi))})`}
      </div>

      {conteggio && (conteggio.bloccate > 0 || conteggio.scartate > 0) && (
        <div className="text-xs text-(--text-secondary) mt-2">
          🥚{" "}
          {[
            conteggio.bloccate > 0 &&
              `${conteggio.bloccate} ${conteggio.bloccate === 1 ? "uovo da scartare" : "uova da scartare"}`,
            conteggio.scartate > 0 &&
              `${conteggio.scartate} ${conteggio.scartate === 1 ? "già scartato" : "già scartate"}`,
          ]
            .filter(Boolean)
            .join(" · ")}
        </div>
      )}

      {s.note && (
        <p className="text-xs text-(--text-secondary) mt-2 mb-0 whitespace-pre-wrap">
          {s.note}
        </p>
      )}

      {isAdmin && (
        <div className="mt-2.5 flex items-center gap-4">
          <button
            type="button"
            onClick={onEdit}
            disabled={pending}
            className="text-xs text-(--primary) font-semibold"
          >
            Modifica
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={pending}
            className="text-xs text-[#c0435a] font-semibold"
          >
            Elimina
          </button>
        </div>
      )}
    </Card>
  );
}

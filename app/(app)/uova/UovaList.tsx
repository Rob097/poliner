"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { useToast } from "@/components/ui/Toast";
import { IconPlus } from "@/components/ui/icons";
import { formatData, etichettaGiornoRelativo } from "@/lib/utils/date";
import {
  calcolaScadenza,
  statoUovoColors,
  statoUovoLabel,
  type Conservazione,
  type ConservazioneSettings,
  type StatoUovo,
} from "@/lib/utils/uova";
import {
  aggiornaConservazione,
  consumaUovo,
  deleteUovo,
  ripristinaUovo,
} from "./actions";

export interface UovoDisplay {
  id: string;
  dataDeposizione: string;
  stato: StatoUovo;
  conservazione: Conservazione;
  fotoUrl: string | null;
  note: string | null;
  gallinaNome: string | null;
  gallinaFotoUrl: string | null;
  nidoNome: string | null;
  regalatoA: string | null;
}

type TabId = "scorte" | "storico";

interface Props {
  uova: UovoDisplay[];
  conservazioneSettings: ConservazioneSettings;
  isAdmin: boolean;
}

export function UovaList({ uova, conservazioneSettings, isAdmin }: Props) {
  const [tab, setTab] = useState<TabId>("scorte");

  const disponibili = useMemo(
    () => uova.filter((u) => u.stato === "disponibile"),
    [uova],
  );
  const consumate = useMemo(() => uova.filter((u) => u.stato === "consumato"), [uova]);
  const regalate = useMemo(() => uova.filter((u) => u.stato === "regalato"), [uova]);

  return (
    <>
      <div className="px-4">
        <SegmentedControl
          options={[
            { value: "scorte", label: "Scorte" },
            { value: "storico", label: "Storico" },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>

      <div className="px-4 pt-3">
        {tab === "scorte" ? (
          <Scorte
            disponibili={disponibili}
            consumate={consumate}
            regalate={regalate}
            settings={conservazioneSettings}
            isAdmin={isAdmin}
          />
        ) : (
          <Storico uova={uova} settings={conservazioneSettings} isAdmin={isAdmin} />
        )}
      </div>
    </>
  );
}

// ── SCORTE TAB ──────────────────────────────────────────
function Scorte({
  disponibili,
  consumate,
  regalate,
  settings,
  isAdmin,
}: {
  disponibili: UovoDisplay[];
  consumate: UovoDisplay[];
  regalate: UovoDisplay[];
  settings: ConservazioneSettings;
  isAdmin: boolean;
}) {
  const inScadenza = useMemo(
    () =>
      disponibili.filter((u) => {
        const s = calcolaScadenza(u.dataDeposizione, u.conservazione, settings);
        return s.livello === "in_scadenza" || s.livello === "urgente";
      }),
    [disponibili, settings],
  );
  const scaduti = useMemo(
    () =>
      disponibili.filter(
        (u) =>
          calcolaScadenza(u.dataDeposizione, u.conservazione, settings).livello ===
          "scaduto",
      ),
    [disponibili, settings],
  );

  // Raggruppa disponibili per data deposizione (solo data, no orario)
  const grouped = useMemo(() => {
    const m = new Map<string, UovoDisplay[]>();
    for (const u of disponibili) {
      const k = u.dataDeposizione.slice(0, 10);
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(u);
    }
    return Array.from(m.entries()).sort(([a], [b]) => b.localeCompare(a));
  }, [disponibili]);

  return (
    <div>
      {/* Summary */}
      <div className="grid grid-cols-3 gap-2.5 mb-4">
        <SummaryCard
          value={disponibili.length}
          label="Disponibili"
          color="#3d6b3d"
          bg="#B5D4B520"
        />
        <SummaryCard
          value={consumate.length}
          label="Consumate"
          color="#b87333"
          bg="#FFE4D030"
        />
        <SummaryCard
          value={regalate.length}
          label="Regalate"
          color="#7b5ea7"
          bg="#E8DAFF30"
        />
      </div>

      {/* Scaduti */}
      {scaduti.length > 0 && (
        <Card
          className="flex gap-2.5 items-center mb-3"
          style={{ background: "#FFD6E044", border: "1px solid #c0435a44" }}
        >
          <span className="text-xl">🚨</span>
          <div className="text-[13px] text-text">
            <strong>{scaduti.length} uova scadute</strong> — controlla e rimuovile.
          </div>
        </Card>
      )}

      {/* In scadenza */}
      {inScadenza.length > 0 && (
        <Card
          className="flex gap-2.5 items-center mb-3"
          style={{ background: "#FFE07A22", border: "1px solid #FFE07A66" }}
        >
          <span className="text-xl">⚠️</span>
          <div className="flex-1 text-[13px] text-text">
            <strong>{inScadenza.length} uova in scadenza</strong> — usale o regalale presto!
          </div>
          {isAdmin && disponibili.length > 0 && (
            <Link href="/uova/regala">
              <Button size="md" className="text-xs px-3 py-2">
                Regala
              </Button>
            </Link>
          )}
        </Card>
      )}

      {/* Empty */}
      {disponibili.length === 0 ? (
        <EmptyState
          icon="🥚"
          title="Nessun uovo in scorta"
          subtitle="Quando raccoglierai un uovo, apparirà qui."
        />
      ) : (
        grouped.map(([date, eggs]) => (
          <div key={date}>
            <div className="flex justify-between items-center mt-3 mb-2">
              <div className="text-[13px] font-bold text-[var(--text-secondary)]">
                {etichettaGiornoRelativo(date)} · {formatData(date)}
              </div>
              <Badge small bg="var(--primary-lighter)" color="var(--primary)">
                {eggs.length} 🥚
              </Badge>
            </div>
            <div className="flex flex-col gap-1.5">
              {eggs.map((u) => (
                <UovoRow key={u.id} u={u} settings={settings} variant="scorta" isAdmin={isAdmin} />
              ))}
            </div>
          </div>
        ))
      )}

      {isAdmin && (
        <>
          <div className="flex gap-2 mt-5">
            <Link href="/uova/nuovo" className="flex-1">
              <Button fullWidth>
                <IconPlus size={18} /> Aggiungi uovo
              </Button>
            </Link>
            <Link href="/uova/regala" className="flex-1">
              <Button variant="secondary" fullWidth disabled={disponibili.length === 0}>
                🎁 Regala uova
              </Button>
            </Link>
          </div>

          <Link
            href="/uova/nidi"
            className="block text-center mt-3 text-sm text-[var(--primary)] font-semibold"
          >
            Gestisci nidi →
          </Link>
        </>
      )}
    </div>
  );
}

// ── STORICO TAB ─────────────────────────────────────────
function Storico({
  uova,
  settings,
  isAdmin,
}: {
  uova: UovoDisplay[];
  settings: ConservazioneSettings;
  isAdmin: boolean;
}) {
  if (uova.length === 0) {
    return (
      <EmptyState
        icon="🥚"
        title="Nessun uovo ancora"
        subtitle="Inizia a raccogliere per costruire lo storico."
      />
    );
  }
  return (
    <div className="flex flex-col gap-1.5">
      {uova.map((u) => (
        <UovoRow key={u.id} u={u} settings={settings} variant="storico" isAdmin={isAdmin} />
      ))}
    </div>
  );
}

function SummaryCard({
  value,
  label,
  color,
  bg,
}: {
  value: number;
  label: string;
  color: string;
  bg: string;
}) {
  return (
    <div
      className="rounded-[var(--radius)] border border-[var(--border)] p-3 text-center"
      style={{ background: bg }}
    >
      <div className="text-2xl font-extrabold" style={{ color }}>
        {value}
      </div>
      <div className="text-[11px] text-[var(--text-secondary)]">{label}</div>
    </div>
  );
}

function UovoRow({
  u,
  settings,
  variant,
  isAdmin,
}: {
  u: UovoDisplay;
  settings: ConservazioneSettings;
  variant: "scorta" | "storico";
  isAdmin: boolean;
}) {
  const { show } = useToast();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const scadenza = calcolaScadenza(u.dataDeposizione, u.conservazione, settings);
  const colors = statoUovoColors(u.stato);

  const scadenzaLabel = (() => {
    if (u.stato !== "disponibile") return null;
    if (scadenza.livello === "scaduto") return "Scaduto";
    if (scadenza.livello === "urgente")
      return `Scade in ${scadenza.giorniRimanenti}gg`;
    if (scadenza.livello === "in_scadenza")
      return `Scade in ${scadenza.giorniRimanenti}gg`;
    return null;
  })();

  function onConsuma() {
    startTransition(async () => {
      const res = await consumaUovo(u.id);
      if (res.ok) show("✓ Segnato come consumato");
      else show("Ops, riprova!");
    });
  }
  function onRipristina() {
    startTransition(async () => {
      const res = await ripristinaUovo(u.id);
      if (res.ok) show("✓ Tornato disponibile");
      else show("Ops, riprova!");
    });
  }
  function onChangeConservazione() {
    startTransition(async () => {
      const next: Conservazione = u.conservazione === "frigo" ? "ambiente" : "frigo";
      const res = await aggiornaConservazione(u.id, next);
      if (res.ok)
        show(next === "frigo" ? "✓ Spostato in frigo" : "✓ A temperatura ambiente");
      else show("Ops, riprova!");
    });
  }
  function onDelete() {
    const confirmed = window.confirm("Eliminare questo uovo dallo storico?");
    if (!confirmed) return;
    startTransition(async () => {
      const res = await deleteUovo(u.id);
      if (res.ok) show("Eliminato");
      else show("Ops, riprova!");
    });
  }

  return (
    <Card
      className="flex flex-col gap-2"
      style={{
        borderLeft:
          scadenza.livello === "scaduto"
            ? "3px solid #c0435a"
            : scadenza.livello === "urgente" || scadenza.livello === "in_scadenza"
              ? "3px solid #FFE07A"
              : undefined,
      }}
    >
      <div className="flex items-center gap-3">
        {u.fotoUrl ? (
          <Avatar src={u.fotoUrl} size={36} alt="Foto uovo" />
        ) : (
          <span className="text-xl">🥚</span>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold">
              {u.gallinaNome ?? "Gallina sconosciuta"}
            </span>
            {variant === "storico" && (
              <span className="text-[11px] text-[var(--text-secondary)]">
                · {formatData(u.dataDeposizione)}
              </span>
            )}
            {scadenzaLabel && (
              <Badge
                small
                bg={scadenza.livello === "scaduto" ? "#FFD6E0" : "#FFE07A44"}
                color={scadenza.livello === "scaduto" ? "#c0435a" : "#8a7020"}
              >
                {scadenzaLabel}
              </Badge>
            )}
          </div>
          <div className="text-xs text-[var(--text-secondary)] truncate">
            {[
              u.nidoNome,
              u.conservazione === "frigo" ? "❄️ frigo" : "🌤️ ambiente",
              u.regalatoA ? `→ ${u.regalatoA}` : null,
              u.note,
            ]
              .filter(Boolean)
              .join(" · ")}
          </div>
        </div>
        <Badge small bg={colors.bg} color={colors.color}>
          {statoUovoLabel(u.stato)}
        </Badge>
        {isAdmin && (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="text-xs text-[var(--text-secondary)] underline-offset-2"
            aria-label="Apri azioni"
          >
            {open ? "✕" : "•••"}
          </button>
        )}
      </div>

      {isAdmin && open && (
        <div className="flex flex-wrap gap-2 pt-1 border-t border-[var(--border)] mt-1">
          {u.stato === "disponibile" && (
            <>
              <Button
                variant="secondary"
                size="md"
                onClick={onConsuma}
                disabled={pending}
                className="text-xs px-3 py-2"
              >
                🍳 Consumato
              </Button>
              <Button
                variant="secondary"
                size="md"
                onClick={onChangeConservazione}
                disabled={pending}
                className="text-xs px-3 py-2"
              >
                {u.conservazione === "frigo" ? "🌤️ Ambiente" : "❄️ Frigo"}
              </Button>
            </>
          )}
          {(u.stato === "consumato" || (u.stato === "regalato" && !u.regalatoA)) && (
            <Button
              variant="secondary"
              size="md"
              onClick={onRipristina}
              disabled={pending}
              className="text-xs px-3 py-2"
            >
              ↩️ Ripristina
            </Button>
          )}
          <button
            type="button"
            onClick={onDelete}
            disabled={pending}
            className="text-xs text-[#c0435a] font-semibold ml-auto"
          >
            Elimina
          </button>
        </div>
      )}
    </Card>
  );
}

"use client";

import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { avatarBgFor, defaultEmojiFor } from "@/lib/utils/avatar";
import { calcolaEta } from "@/lib/utils/eta";
import { trovaRazza, uovaAnnoLabel, type Razza, type Origine } from "@/lib/data/razze";
import type { AnimalePubblico } from "./PaginaPubblicaView";

interface Props {
  galline: AnimalePubblico[];
  galli: AnimalePubblico[];
}

export function GalleriaAnimali({ galline, galli }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const all = [...galline, ...galli];
  const active = activeId ? all.find((a) => a.id === activeId) ?? null : null;

  return (
    <>
      {galline.length > 0 && (
        <section className="px-5 mt-6">
          <h2 className="font-serif text-lg font-bold mb-2">Le galline</h2>
          <div className="grid grid-cols-2 gap-2">
            {galline.map((g) => (
              <AnimaleCard key={g.id} a={g} onClick={() => setActiveId(g.id)} />
            ))}
          </div>
        </section>
      )}

      {galli.length > 0 && (
        <section className="px-5 mt-6">
          <h2 className="font-serif text-lg font-bold mb-2">
            {galli.length === 1 ? "Il gallo" : "I galli"}
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {galli.map((g) => (
              <AnimaleCard key={g.id} a={g} onClick={() => setActiveId(g.id)} />
            ))}
          </div>
        </section>
      )}

      {active && (
        <Modal title={active.nome} onClose={() => setActiveId(null)}>
          <SchedaAnimale animale={active} />
        </Modal>
      )}
    </>
  );
}

function AnimaleCard({
  a,
  onClick,
}: {
  a: AnimalePubblico;
  onClick: () => void;
}) {
  const razza = trovaRazza(a.razzaId);
  const razzaNome = razza?.nome ?? a.razzaCustom ?? null;
  const eta = a.dataNascita ? calcolaEta(a.dataNascita) : null;

  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left"
      aria-label={`Apri scheda di ${a.nome}`}
    >
      <Card className="text-center py-3 transition-transform active:scale-[0.98]">
        <div className="flex justify-center mb-1.5">
          <Avatar
            src={a.fotoUrl ?? undefined}
            emoji={!a.fotoUrl ? defaultEmojiFor(a.tipo) : undefined}
            bg={avatarBgFor(a.id)}
            name={a.nome}
            size={64}
          />
        </div>
        <div className="font-semibold text-sm truncate px-2">{a.nome}</div>
        {razzaNome && (
          <div className="text-[11px] text-[var(--text-secondary)] mt-0.5 truncate px-2">
            {razzaNome}
          </div>
        )}
        {eta && (
          <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">{eta}</div>
        )}
      </Card>
    </button>
  );
}

function SchedaAnimale({ animale }: { animale: AnimalePubblico }) {
  const razza = trovaRazza(animale.razzaId);
  const razzaNome = razza?.nome ?? animale.razzaCustom ?? null;
  const eta = animale.dataNascita ? calcolaEta(animale.dataNascita) : null;

  return (
    <div>
      {/* Header con foto grande e meta */}
      <div className="flex flex-col items-center text-center mb-4">
        <Avatar
          src={animale.fotoUrl ?? undefined}
          emoji={!animale.fotoUrl ? defaultEmojiFor(animale.tipo) : undefined}
          bg={avatarBgFor(animale.id)}
          name={animale.nome}
          size={120}
        />
        <div className="text-xs text-[var(--text-secondary)] mt-2 flex flex-wrap gap-1.5 justify-center">
          <span>
            {animale.tipo === "gallo" ? "🐓 Gallo" : "🐔 Gallina"}
          </span>
          {razzaNome && <span>· {razzaNome}</span>}
          {eta && <span>· {eta}</span>}
        </div>
        {animale.colorePiumaggio && (
          <div className="text-xs text-[var(--text-secondary)] mt-1">
            🎨 {animale.colorePiumaggio}
          </div>
        )}
      </div>

      {/* Descrizione admin */}
      {animale.descrizionePubblica && (
        <div className="mb-4">
          <p className="text-[15px] text-text leading-relaxed m-0 whitespace-pre-wrap">
            {animale.descrizionePubblica}
          </p>
        </div>
      )}

      {/* Scheda razza */}
      {razza && razza.id !== "mista" && (
        <SchedaRazza razza={razza} tipo={animale.tipo} />
      )}
    </div>
  );
}

const ORIGINE_LABEL: Record<Origine, { label: string; emoji: string }> = {
  italiana: { label: "Italiana", emoji: "🇮🇹" },
  internazionale: { label: "Internazionale", emoji: "🌍" },
  mista: { label: "Mista", emoji: "✨" },
};

const TAGLIA_LABEL: Record<Razza["taglia"], string> = {
  nana: "Nana",
  piccola: "Piccola",
  media: "Media",
  grande: "Grande",
  "molto-grande": "Molto grande",
  leggera: "Leggera",
};

function SchedaRazza({
  razza,
  tipo,
}: {
  razza: Razza;
  tipo: AnimalePubblico["tipo"];
}) {
  const origine = ORIGINE_LABEL[razza.origine];
  const showEggInfo = tipo === "gallina";

  return (
    <div
      className="rounded-[var(--radius)] p-4"
      style={{ background: "var(--primary-lighter)" }}
    >
      <div className="text-[13px] font-semibold text-[var(--primary)] mb-2">
        Caratteristiche della razza
      </div>
      <div className="grid grid-cols-2 gap-y-2 gap-x-3 text-[12px] text-text">
        {showEggInfo && <RigaScheda emoji="🥚" label="Uova/anno" value={uovaAnnoLabel(razza)} />}
        {showEggInfo && <RigaScheda emoji="🎨" label="Colore uova" value={razza.coloreUova} />}
        <RigaScheda emoji="📏" label="Taglia" value={TAGLIA_LABEL[razza.taglia]} />
        <RigaScheda emoji={origine.emoji} label="Origine" value={origine.label} />
      </div>
      <div className="mt-3 text-[12px] text-text">
        <span aria-hidden>💝 </span>
        <span className="text-[var(--text-secondary)]">Temperamento: </span>
        {razza.temperamento}
      </div>
    </div>
  );
}

function RigaScheda({
  emoji,
  label,
  value,
}: {
  emoji: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-baseline gap-1.5 leading-snug">
      <span aria-hidden>{emoji}</span>
      <div>
        <div className="text-[11px] text-[var(--text-secondary)] leading-tight">
          {label}
        </div>
        <div className="font-semibold leading-tight">{value}</div>
      </div>
    </div>
  );
}

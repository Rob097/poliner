"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { IconChevron, IconPlus, IconSearch } from "@/components/ui/icons";
import { calcolaEta } from "@/lib/utils/eta";
import { avatarBgFor, defaultEmojiFor } from "@/lib/utils/avatar";
import { trovaRazza } from "@/lib/data/razze";
import { cn } from "@/lib/utils/cn";

export interface GallinaDisplay {
  id: string;
  nome: string;
  tipo: "gallina" | "gallo";
  razzaId: string | null;
  razzaCustom: string | null;
  dataNascita: string | null;
  fotoUrl: string | null;
  inMutaDal: string | null;
  problemaAttivo: string | null;
  inHomeHospital: boolean;
  inInserimento: boolean;
  uovaUltimaSettimana: number;
}

interface Props {
  galline: GallinaDisplay[];
  pollaioId: string;
  defunteCount: number;
}

type Filtro = "tutte" | "home-hospital" | "inserimento";

export function GallineListClient({ galline, defunteCount }: Props) {
  const [query, setQuery] = useState("");
  const searchParams = useSearchParams();
  const filtroParam = searchParams.get("filtro");
  const initialFiltro: Filtro =
    filtroParam === "home-hospital"
      ? "home-hospital"
      : filtroParam === "inserimento"
        ? "inserimento"
        : "tutte";
  const [filtro, setFiltro] = useState<Filtro>(initialFiltro);
  const hhCount = galline.filter((g) => g.inHomeHospital).length;
  const insCount = galline.filter((g) => g.inInserimento).length;

  const filtered = useMemo(() => {
    let base = galline;
    if (filtro === "home-hospital") {
      base = base.filter((g) => g.inHomeHospital);
    } else if (filtro === "inserimento") {
      base = base.filter((g) => g.inInserimento);
    }
    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter((g) => {
      const razzaNome = trovaRazza(g.razzaId)?.nome ?? g.razzaCustom ?? "";
      return (
        g.nome.toLowerCase().includes(q) ||
        razzaNome.toLowerCase().includes(q)
      );
    });
  }, [galline, query, filtro]);

  return (
    <>
      {galline.length > 0 && (
        <div className="relative mb-3">
          <IconSearch
            size={18}
            color="var(--text-secondary)"
            style={{ position: "absolute", left: 14, top: 13 }}
          />
          <Input
            placeholder="Cerca per nome o razza..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      )}

      {(hhCount > 0 || insCount > 0) && (
        <div className="flex gap-2 mb-3 overflow-x-auto pb-0.5">
          <FiltroChip
            active={filtro === "tutte"}
            onClick={() => setFiltro("tutte")}
          >
            Tutte ({galline.length})
          </FiltroChip>
          {hhCount > 0 && (
            <FiltroChip
              active={filtro === "home-hospital"}
              onClick={() => setFiltro("home-hospital")}
            >
              🏠 In casa ({hhCount})
            </FiltroChip>
          )}
          {insCount > 0 && (
            <FiltroChip
              active={filtro === "inserimento"}
              onClick={() => setFiltro("inserimento")}
            >
              🏠+→ In inserimento ({insCount})
            </FiltroChip>
          )}
        </div>
      )}

      {galline.length === 0 ? (
        <EmptyState
          icon="🐔"
          title="Nessuna gallina ancora"
          subtitle="Aggiungi la prima gallina del tuo pollaio per iniziare a tenerne traccia."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="🔍"
          title="Nessun risultato"
          subtitle="Prova con un altro nome o razza."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((g) => (
            <GallinaRow key={g.id} g={g} />
          ))}
        </div>
      )}

      <Link href="/galline/nuova" className="block mt-4">
        <Button fullWidth>
          <IconPlus size={18} /> Aggiungi animale
        </Button>
      </Link>

      {defunteCount > 0 && (
        <Link
          href="/galline/in-memoria"
          className="block mt-3 text-center text-sm text-(--text-secondary) py-2"
        >
          💔 {defunteCount} {defunteCount === 1 ? "gallina ricordata" : "galline ricordate"} →
        </Link>
      )}
    </>
  );
}

function FiltroChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors whitespace-nowrap",
        active
          ? "bg-(--primary) text-white border-(--primary)"
          : "bg-white text-text border-(--border) active:bg-(--border)",
      )}
    >
      {children}
    </button>
  );
}

function GallinaRow({ g }: { g: GallinaDisplay }) {
  const razza = trovaRazza(g.razzaId);
  const razzaNome = razza?.nome ?? g.razzaCustom ?? "Razza non specificata";
  const eta = g.dataNascita ? calcolaEta(g.dataNascita) : null;
  const subtitle = [razzaNome, eta].filter(Boolean).join(" · ");
  const bg = avatarBgFor(g.id);
  const emoji = defaultEmojiFor(g.tipo);

  return (
    <Link href={`/galline/${g.id}`} className="block">
      <Card clickable className="flex items-center gap-3">
        <Avatar
          src={g.fotoUrl ?? undefined}
          emoji={!g.fotoUrl ? emoji : undefined}
          bg={bg}
          name={g.nome}
          size={48}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-[15px] text-text">{g.nome}</span>
            {g.inHomeHospital && (
              <Badge small bg="#FFE07A55" color="#7a5d1a">
                🏠 In casa
              </Badge>
            )}
            {g.inInserimento && (
              <Badge small bg="#FFE07A55" color="#7a5d1a">
                🏠+→ Inserimento
              </Badge>
            )}
            {g.problemaAttivo && (
              <Badge small bg="#FFD6E0" color="#c0435a">
                ❤️‍🩹 Salute
              </Badge>
            )}
            {g.inMutaDal && (
              <Badge small bg="#E8DAFF" color="#7b5ea7">
                🪶 In muta
              </Badge>
            )}
          </div>
          <div className="text-[13px] text-(--text-secondary) mt-0.5 truncate">
            {subtitle}
          </div>
        </div>
        {g.tipo === "gallina" ? (
          <div className="text-center">
            <div className="text-lg font-extrabold text-(--primary) leading-none">
              {g.uovaUltimaSettimana}
            </div>
            <div className="text-[10px] text-(--text-secondary) mt-0.5">
              uova/sett
            </div>
          </div>
        ) : (
          <IconChevron size={18} color="var(--text-secondary)" />
        )}
      </Card>
    </Link>
  );
}

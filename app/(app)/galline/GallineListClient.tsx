"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
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
  uovaUltimaSettimana: number;
}

interface Props {
  galline: GallinaDisplay[];
  pollaioId: string;
}

export function GallineListClient({ galline }: Props) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return galline;
    return galline.filter((g) => {
      const razzaNome = trovaRazza(g.razzaId)?.nome ?? g.razzaCustom ?? "";
      return (
        g.nome.toLowerCase().includes(q) ||
        razzaNome.toLowerCase().includes(q)
      );
    });
  }, [galline, query]);

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
    </>
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
          <div className="text-[13px] text-[var(--text-secondary)] mt-0.5 truncate">
            {subtitle}
          </div>
        </div>
        {g.tipo === "gallina" ? (
          <div className="text-center">
            <div className="text-lg font-extrabold text-[var(--primary)] leading-none">
              {g.uovaUltimaSettimana}
            </div>
            <div className="text-[10px] text-[var(--text-secondary)] mt-0.5">
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

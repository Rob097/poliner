"use client";

import { useMemo, useState, useTransition } from "react";
import { Header } from "@/components/ui/Header";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input, Select } from "@/components/ui/Input";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { useToast } from "@/components/ui/Toast";
import { IconCheck, IconPlus, IconShare, IconTrash } from "@/components/ui/icons";
import { cn } from "@/lib/utils/cn";
import {
  aggiungiVoce,
  eliminaVoce,
  svuotaAcquistati,
  toggleVoce,
  type CategoriaLista,
} from "./actions";

export interface VoceLista {
  id: string;
  testo: string;
  categoria: CategoriaLista | null;
  quantita: string | null;
  comprato: boolean;
}

const CAT_COLORS: Record<CategoriaLista, string> = {
  cibo: "#FFE07A",
  lettiera: "#B5D4B5",
  medicinali: "#E8DAFF",
  altro: "#F0EDE8",
};

const CAT_LABEL: Record<CategoriaLista, string> = {
  cibo: "Cibo",
  lettiera: "Lettiera",
  medicinali: "Medicinali",
  altro: "Altro",
};

interface Props {
  items: VoceLista[];
  pollaioNome: string;
}

export function ListaSpesaClient({ items, pollaioNome }: Props) {
  const { show } = useToast();
  const [nuovoTesto, setNuovoTesto] = useState("");
  const [nuovaCategoria, setNuovaCategoria] = useState<CategoriaLista>("cibo");
  const [pending, startTransition] = useTransition();

  const pending2 = items.filter((i) => !i.comprato);
  const done = items.filter((i) => i.comprato);

  function onAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!nuovoTesto.trim()) return;
    startTransition(async () => {
      const res = await aggiungiVoce({
        testo: nuovoTesto,
        categoria: nuovaCategoria,
        quantita: null,
      });
      if (res.ok) {
        setNuovoTesto("");
      } else {
        show(res.error ?? "Ops, riprova!");
      }
    });
  }

  async function onShare() {
    const lines = pending2.map((v) => {
      const prefix = v.categoria ? `[${CAT_LABEL[v.categoria]}] ` : "";
      const qty = v.quantita ? ` (${v.quantita})` : "";
      return `• ${prefix}${v.testo}${qty}`;
    });
    const text = `🛒 Lista della spesa per ${pollaioNome}\n\n${lines.join("\n")}`;

    // Web Share API se disponibile (mobile)
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ title: "Lista della spesa", text });
        return;
      } catch {
        // Utente ha annullato lo share — fallback al copy
      }
    }
    // Fallback: copia negli appunti
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      show("✓ Lista copiata negli appunti!");
    }
  }

  function onSvuota() {
    if (done.length === 0) return;
    const confirmed = window.confirm(`Eliminare ${done.length} voci acquistate?`);
    if (!confirmed) return;
    startTransition(async () => {
      const res = await svuotaAcquistati();
      if (res.ok) show("✓ Lista pulita");
      else show("Ops, riprova!");
    });
  }

  return (
    <>
      <Header
        title="Lista della spesa"
        subtitle={
          pending2.length === 0
            ? "Tutto comprato! 🎉"
            : `${pending2.length} da comprare`
        }
        right={
          pending2.length > 0 ? (
            <button
              type="button"
              onClick={onShare}
              className="p-1.5"
              aria-label="Condividi lista"
            >
              <IconShare size={20} color="var(--text-secondary)" />
            </button>
          ) : null
        }
      />
      <ScreenContainer>
        {/* Pending */}
        {pending2.length === 0 ? (
          <EmptyState
            icon="🛒"
            title="Niente da comprare"
            subtitle="Aggiungi sotto la prima voce della lista."
          />
        ) : (
          <div className="flex flex-col gap-1.5">
            {pending2.map((v) => (
              <VoceRow key={v.id} voce={v} disabled={pending} />
            ))}
          </div>
        )}

        {/* Aggiungi inline */}
        <form onSubmit={onAdd} className="flex gap-2 mt-4">
          <Select
            value={nuovaCategoria}
            onChange={(e) => setNuovaCategoria(e.target.value as CategoriaLista)}
            className="max-w-[120px]"
          >
            {(Object.keys(CAT_LABEL) as CategoriaLista[]).map((c) => (
              <option key={c} value={c}>
                {CAT_LABEL[c]}
              </option>
            ))}
          </Select>
          <Input
            value={nuovoTesto}
            onChange={(e) => setNuovoTesto(e.target.value)}
            placeholder="Aggiungi alla lista..."
          />
          <Button
            type="submit"
            disabled={!nuovoTesto.trim() || pending}
            className="px-4 py-2 flex-shrink-0"
            aria-label="Aggiungi"
          >
            <IconPlus size={18} />
          </Button>
        </form>

        {/* Acquistati */}
        {done.length > 0 && (
          <>
            <SectionTitle
              right={
                <button
                  type="button"
                  onClick={onSvuota}
                  disabled={pending}
                  className="text-xs text-[var(--text-secondary)]"
                >
                  Svuota
                </button>
              }
            >
              Acquistati ({done.length})
            </SectionTitle>
            <div className="flex flex-col gap-1.5">
              {done.map((v) => (
                <VoceRow key={v.id} voce={v} disabled={pending} />
              ))}
            </div>
          </>
        )}

        {/* Hint */}
        {pending2.length > 0 && (
          <p className="text-center text-xs text-[var(--text-secondary)] mt-6">
            Tocca un&apos;icona per segnare come comprato.
            <br />
            Usa &quot;Condividi&quot; per inviare la lista a chi fa la spesa.
          </p>
        )}
      </ScreenContainer>
    </>
  );
}

function VoceRow({ voce, disabled }: { voce: VoceLista; disabled: boolean }) {
  const { show } = useToast();
  const [pending, startTransition] = useTransition();
  const isDisabled = pending || disabled;

  function toggle() {
    startTransition(async () => {
      const res = await toggleVoce(voce.id, !voce.comprato);
      if (!res.ok) show("Ops, riprova!");
    });
  }
  function del() {
    startTransition(async () => {
      const res = await eliminaVoce(voce.id);
      if (!res.ok) show("Ops, riprova!");
    });
  }

  const catColor = voce.categoria ? CAT_COLORS[voce.categoria] : "#F0EDE8";

  return (
    <Card
      className={cn(
        "flex items-center gap-3 py-2.5 px-3.5 cursor-pointer transition-opacity",
        voce.comprato && "opacity-60",
      )}
      onClick={toggle}
    >
      <div
        className="w-6 h-6 rounded-lg flex-shrink-0 flex items-center justify-center transition-colors"
        style={{
          background: voce.comprato ? "var(--primary)" : "transparent",
          border: voce.comprato ? "none" : "2px solid var(--primary)",
        }}
      >
        {voce.comprato && <IconCheck size={14} color="#fff" />}
      </div>
      <div className="flex-1 min-w-0">
        <div
          className={cn(
            "text-sm font-semibold truncate",
            voce.comprato && "line-through",
          )}
        >
          {voce.testo}
          {voce.quantita && (
            <span className="text-[var(--text-secondary)] ml-1 font-normal">
              ({voce.quantita})
            </span>
          )}
        </div>
      </div>
      {voce.categoria && (
        <Badge small bg={`${catColor}44`} color="var(--text-secondary)">
          {CAT_LABEL[voce.categoria]}
        </Badge>
      )}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          del();
        }}
        disabled={isDisabled}
        className="text-[var(--text-secondary)] p-1"
        aria-label="Elimina"
      >
        <IconTrash size={14} />
      </button>
    </Card>
  );
}

"use client";

import { useMemo, useState, useTransition } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { FormField } from "@/components/ui/FormField";
import { Input, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { useToast } from "@/components/ui/Toast";
import { IconPlus, IconEdit } from "@/components/ui/icons";
import { formatData, todayIso } from "@/lib/utils/date";
import { createSpesa, deleteSpesa, updateSpesa } from "./actions";

export interface SpesaItem {
  id: string;
  data: string;
  importo: number;
  descrizione: string;
  categoria: string | null;
  note: string | null;
}

type Periodo = "mese" | "tre_mesi" | "anno" | "tutto";

const SUGGERIMENTI_FALLBACK = [
  "Mais",
  "Pellet bio",
  "Mangime completo",
  "Trucciolo",
  "Corteccia di pino",
  "Terra di diatomea",
  "Paglia per nidi",
  "Vermifugo",
  "Veterinario",
  "Attrezzatura",
];

interface Props {
  spese: SpesaItem[];
  uovaDate: string[];
  suggerimenti: string[];
}

export function SpeseClient({ spese, uovaDate, suggerimenti }: Props) {
  const [periodo, setPeriodo] = useState<Periodo>("mese");
  const [editing, setEditing] = useState<SpesaItem | null>(null);
  const [creating, setCreating] = useState(false);

  // Periodo → soglia data (UTC start of)
  const sogliaData = useMemo(() => sogliaPerPeriodo(periodo), [periodo]);

  const speseFiltrate = useMemo(
    () => spese.filter((s) => !sogliaData || s.data >= sogliaData),
    [spese, sogliaData],
  );
  const uovaFiltrate = useMemo(
    () =>
      uovaDate.filter((d) => !sogliaData || d.slice(0, 10) >= sogliaData),
    [uovaDate, sogliaData],
  );

  const totaleSpese = useMemo(
    () => speseFiltrate.reduce((acc, s) => acc + s.importo, 0),
    [speseFiltrate],
  );
  const totaleUova = uovaFiltrate.length;
  const costoPerUovo =
    totaleUova > 0 ? (totaleSpese / totaleUova).toFixed(2) : null;

  const allSuggerimenti = useMemo(
    () => Array.from(new Set([...suggerimenti, ...SUGGERIMENTI_FALLBACK])),
    [suggerimenti],
  );

  // Raggruppa per categoria (per visualizzazione "per categoria")
  const perCategoria = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of speseFiltrate) {
      const key = s.categoria ?? "Altro";
      m.set(key, (m.get(key) ?? 0) + s.importo);
    }
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [speseFiltrate]);

  return (
    <>
      <SegmentedControl
        options={[
          { value: "mese", label: "Mese" },
          { value: "tre_mesi", label: "3 mesi" },
          { value: "anno", label: "Anno" },
          { value: "tutto", label: "Tutto" },
        ]}
        value={periodo}
        onChange={setPeriodo}
      />

      <div className="grid grid-cols-2 gap-2.5 mt-3">
        <div
          className="rounded-[var(--radius)] border border-[var(--border)] p-3 text-center"
          style={{ background: "#FFE07A22" }}
        >
          <div className="text-2xl font-extrabold text-text">
            €{totaleSpese.toFixed(0)}
          </div>
          <div className="text-[11px] text-[var(--text-secondary)]">
            Totale spese
          </div>
        </div>
        <div
          className="rounded-[var(--radius)] border border-[var(--border)] p-3 text-center"
          style={{ background: "var(--primary-lighter)" }}
        >
          <div className="text-2xl font-extrabold text-[var(--primary)]">
            {costoPerUovo ? `€${costoPerUovo}` : "—"}
          </div>
          <div className="text-[11px] text-[var(--text-secondary)]">
            Costo per uovo
          </div>
        </div>
      </div>
      {costoPerUovo && totaleUova > 0 && (
        <div className="text-center text-xs text-[var(--text-secondary)] italic mt-1.5">
          Ogni uovo ti è costato circa €{costoPerUovo} 🥚
        </div>
      )}

      {perCategoria.length > 1 && (
        <>
          <SectionTitle>Per categoria</SectionTitle>
          <Card>
            <div className="flex flex-col gap-2">
              {perCategoria.map(([cat, tot]) => {
                const perc = Math.round((tot / totaleSpese) * 100);
                return (
                  <div key={cat}>
                    <div className="flex justify-between text-[13px]">
                      <span className="font-semibold">{cat}</span>
                      <span className="text-[var(--text-secondary)]">
                        €{tot.toFixed(0)} ({perc}%)
                      </span>
                    </div>
                    <div className="h-1.5 bg-[var(--border)] rounded mt-1 overflow-hidden">
                      <div
                        className="h-full rounded"
                        style={{
                          width: `${perc}%`,
                          background: "#FFE07A",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </>
      )}

      <SectionTitle
        right={
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="text-xs text-[var(--primary)] font-semibold flex items-center gap-1"
          >
            <IconPlus size={14} /> Aggiungi
          </button>
        }
      >
        {periodo === "tutto" ? "Tutte le spese" : "Spese recenti"}
      </SectionTitle>

      {speseFiltrate.length === 0 ? (
        <EmptyState
          icon="💶"
          title="Nessuna spesa nel periodo"
          subtitle="Registra le tue spese per scoprire quanto ti costa ogni uovo."
          action="Aggiungi prima spesa"
          onAction={() => setCreating(true)}
        />
      ) : (
        <div className="flex flex-col gap-1.5">
          {speseFiltrate.map((s) => (
            <SpesaRow key={s.id} spesa={s} onEdit={() => setEditing(s)} />
          ))}
        </div>
      )}

      <Button fullWidth className="mt-4" onClick={() => setCreating(true)}>
        <IconPlus size={18} /> Aggiungi spesa
      </Button>

      {creating && (
        <SpesaFormModal
          mode="create"
          suggerimenti={allSuggerimenti}
          onClose={() => setCreating(false)}
        />
      )}
      {editing && (
        <SpesaFormModal
          mode="edit"
          initial={editing}
          suggerimenti={allSuggerimenti}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}

function SpesaRow({ spesa, onEdit }: { spesa: SpesaItem; onEdit: () => void }) {
  return (
    <Card className="flex items-center gap-3 py-2.5 px-3.5">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
        style={{ background: "#FFE07A33" }}
      >
        💶
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm truncate">{spesa.descrizione}</div>
        <div className="text-xs text-[var(--text-secondary)] truncate">
          {formatData(spesa.data)}
          {spesa.categoria ? ` · ${spesa.categoria}` : ""}
          {spesa.note ? ` · ${spesa.note}` : ""}
        </div>
      </div>
      <div className="font-bold text-[15px]">€{spesa.importo.toFixed(2)}</div>
      <button
        type="button"
        onClick={onEdit}
        className="text-[var(--text-secondary)] ml-1"
        aria-label="Modifica"
      >
        <IconEdit size={16} />
      </button>
    </Card>
  );
}

function SpesaFormModal({
  mode,
  initial,
  suggerimenti,
  onClose,
}: {
  mode: "create" | "edit";
  initial?: SpesaItem;
  suggerimenti: string[];
  onClose: () => void;
}) {
  const { show } = useToast();
  const [data, setData] = useState(
    initial?.data ?? todayIso(),
  );
  const [importo, setImporto] = useState(initial?.importo.toFixed(2) ?? "");
  const [descrizione, setDescrizione] = useState(initial?.descrizione ?? "");
  const [categoria, setCategoria] = useState(initial?.categoria ?? "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const importoNum = parseFloat(importo.replace(",", "."));
    if (Number.isNaN(importoNum) || importoNum <= 0) {
      show("Inserisci un importo valido");
      return;
    }
    startTransition(async () => {
      const payload = {
        data,
        importoEuro: importoNum,
        descrizione,
        categoria: categoria || null,
        note: note || null,
      };
      const res =
        mode === "create"
          ? await createSpesa(payload)
          : await updateSpesa(initial!.id, payload);
      if (res.ok) {
        show(mode === "create" ? "✓ Spesa registrata" : "✓ Modifiche salvate");
        onClose();
      } else {
        show(res.error ?? "Ops, riprova!");
      }
    });
  }

  function onDelete() {
    if (!initial) return;
    const confirmed = window.confirm("Eliminare questa spesa?");
    if (!confirmed) return;
    startTransition(async () => {
      const res = await deleteSpesa(initial.id);
      if (res.ok) {
        show("Spesa eliminata");
        onClose();
      } else show("Ops, riprova!");
    });
  }

  return (
    <Modal
      title={mode === "create" ? "Aggiungi spesa" : "Modifica spesa"}
      onClose={onClose}
    >
      <form onSubmit={onSubmit}>
        <FormField label="Cosa hai comprato?">
          <Input
            value={descrizione}
            onChange={(e) => setDescrizione(e.target.value)}
            list="spesa-suggerimenti"
            placeholder={`Es. "Mais e cereali"`}
            required
            autoFocus
          />
          <datalist id="spesa-suggerimenti">
            {suggerimenti.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </FormField>

        <FormField label="Importo (€)">
          <Input
            type="text"
            inputMode="decimal"
            value={importo}
            onChange={(e) => setImporto(e.target.value)}
            placeholder="0,00"
            required
          />
        </FormField>

        <FormField label="Data">
          <Input
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            max={todayIso()}
            required
          />
        </FormField>

        <FormField label="Categoria (opzionale)">
          <Input
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            placeholder="Es. cibo, lettiera, veterinario"
          />
        </FormField>

        <FormField label="Note (opzionale)">
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
          />
        </FormField>

        <Button
          type="submit"
          fullWidth
          size="lg"
          disabled={!descrizione.trim() || !importo || pending}
        >
          {pending
            ? "Salvataggio..."
            : mode === "create"
              ? "Registra spesa"
              : "Salva modifiche"}
        </Button>

        {mode === "edit" && (
          <button
            type="button"
            onClick={onDelete}
            disabled={pending}
            className="block w-full text-sm text-[#c0435a] font-semibold py-3 mt-2"
          >
            Elimina spesa
          </button>
        )}
      </form>
    </Modal>
  );
}

function sogliaPerPeriodo(p: Periodo): string | null {
  if (p === "tutto") return null;
  const d = new Date();
  if (p === "mese") d.setMonth(d.getMonth() - 1);
  else if (p === "tre_mesi") d.setMonth(d.getMonth() - 3);
  else d.setFullYear(d.getFullYear() - 1);
  return d.toISOString().slice(0, 10);
}

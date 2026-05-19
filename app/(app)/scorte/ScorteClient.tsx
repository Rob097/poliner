"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { IconPlus, IconEdit } from "@/components/ui/icons";
import {
  consumaScorta,
  createScorta,
  deleteScorta,
  rifornisciScorta,
  updateScorta,
} from "./actions";
import { aggiungiVoce } from "../lista-spesa/actions";

export interface ScortaItem {
  id: string;
  nome: string;
  quantita: number | null;
  unita: string | null;
  sogliaAvviso: number | null;
}

const SUGGERIMENTI_FALLBACK = [
  "Mais",
  "Pellet bio",
  "Mangime completo",
  "Cereali misti",
  "Crusca",
  "Conchiglie d'ostrica",
  "Grit",
  "Erba medica",
  "Vermifugo",
  "Antiparassitario",
  "Trucciolo",
  "Corteccia di pino",
  "Paglia",
];

const UNITA_FALLBACK = ["kg", "sacchi", "porzioni", "lt", "confezioni"];

export function ScorteClient({
  items,
  nomiUsati,
}: {
  items: ScortaItem[];
  nomiUsati: string[];
}) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ScortaItem | null>(null);
  const [refillTarget, setRefillTarget] = useState<ScortaItem | null>(null);
  const [consumeTarget, setConsumeTarget] = useState<ScortaItem | null>(null);

  const suggerimenti = Array.from(new Set([...nomiUsati, ...SUGGERIMENTI_FALLBACK]));

  const basse = items.filter(isLow);

  return (
    <>
      {basse.length > 0 && (
        <Card
          className="flex gap-3 items-start mb-3"
          style={{ background: "#FFE07A22", border: "1px solid #FFE07A66" }}
        >
          <span className="text-xl">⚠️</span>
          <div className="flex-1 text-[13px] text-text">
            <strong>{basse.length} scorta{basse.length === 1 ? "" : "e"} basse</strong>:{" "}
            {basse.map((s) => s.nome).join(", ")}
          </div>
        </Card>
      )}

      {items.length === 0 ? (
        <EmptyState
          icon="📦"
          title="Nessuna scorta tracciata"
          subtitle="Aggiungi mais, pellet, lettiera... per ricevere avvisi quando stanno per finire."
          action="Aggiungi prima scorta"
          onAction={() => setCreating(true)}
        />
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((s) => (
            <ScortaRow
              key={s.id}
              scorta={s}
              onEdit={() => setEditing(s)}
              onRefill={() => setRefillTarget(s)}
              onConsume={() => setConsumeTarget(s)}
            />
          ))}
        </div>
      )}

      <Button fullWidth className="mt-4" onClick={() => setCreating(true)}>
        <IconPlus size={18} /> Aggiungi scorta
      </Button>

      {creating && (
        <ScortaFormModal
          mode="create"
          suggerimenti={suggerimenti}
          onClose={() => setCreating(false)}
        />
      )}
      {editing && (
        <ScortaFormModal
          mode="edit"
          initial={editing}
          suggerimenti={suggerimenti}
          onClose={() => setEditing(null)}
        />
      )}
      {refillTarget && (
        <RefillModal
          scorta={refillTarget}
          onClose={() => setRefillTarget(null)}
        />
      )}
      {consumeTarget && (
        <ConsumeModal
          scorta={consumeTarget}
          onClose={() => setConsumeTarget(null)}
        />
      )}
    </>
  );
}

function isLow(s: ScortaItem): boolean {
  if (s.sogliaAvviso === null || s.quantita === null) return false;
  return s.quantita <= s.sogliaAvviso;
}

function ScortaRow({
  scorta,
  onEdit,
  onRefill,
  onConsume,
}: {
  scorta: ScortaItem;
  onEdit: () => void;
  onRefill: () => void;
  onConsume: () => void;
}) {
  const { show } = useToast();
  const [pending, startTransition] = useTransition();
  const low = isLow(scorta);

  function addToShoppingList() {
    startTransition(async () => {
      const res = await aggiungiVoce({
        testo: scorta.nome,
        categoria: "cibo",
        quantita: null,
      });
      if (res.ok) show("✓ Aggiunto alla lista della spesa");
      else show("Ops, riprova!");
    });
  }

  return (
    <Card style={{ borderLeft: low ? "4px solid #FFE07A" : undefined }}>
      <div className="flex items-start gap-3">
        <span className="text-2xl">📦</span>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start gap-2">
            <div className="font-semibold text-sm truncate">{scorta.nome}</div>
            <button
              type="button"
              onClick={onEdit}
              className="text-[var(--text-secondary)] -mt-0.5"
              aria-label="Modifica"
            >
              <IconEdit size={16} />
            </button>
          </div>
          <div className="text-xs text-[var(--text-secondary)] mt-0.5">
            {scorta.quantita !== null ? (
              <>
                {scorta.quantita} {scorta.unita ?? ""}
                {scorta.sogliaAvviso !== null && (
                  <span className="ml-2">(soglia: {scorta.sogliaAvviso} {scorta.unita ?? ""})</span>
                )}
              </>
            ) : (
              "Quantità non tracciata"
            )}
          </div>
          {low && (
            <div className="mt-1">
              <Badge small bg="#FFE07A44" color="#8a7020">
                ⚠️ Scorta bassa
              </Badge>
            </div>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mt-2">
        <Button
          variant="secondary"
          size="md"
          onClick={onRefill}
          className="text-xs px-3 py-2"
        >
          + Rifornimento
        </Button>
        {scorta.quantita !== null && scorta.quantita > 0 && (
          <Button
            variant="secondary"
            size="md"
            onClick={onConsume}
            className="text-xs px-3 py-2"
          >
            − Consuma
          </Button>
        )}
        {low && (
          <Button
            variant="text"
            onClick={addToShoppingList}
            disabled={pending}
            className="text-xs"
          >
            🛒 Aggiungi alla spesa
          </Button>
        )}
      </div>
    </Card>
  );
}

function ScortaFormModal({
  mode,
  initial,
  suggerimenti,
  onClose,
}: {
  mode: "create" | "edit";
  initial?: ScortaItem;
  suggerimenti: string[];
  onClose: () => void;
}) {
  const { show } = useToast();
  const [nome, setNome] = useState(initial?.nome ?? "");
  const [quantita, setQuantita] = useState(
    initial?.quantita !== null && initial?.quantita !== undefined
      ? String(initial.quantita)
      : "",
  );
  const [unita, setUnita] = useState(initial?.unita ?? "");
  const [soglia, setSoglia] = useState(
    initial?.sogliaAvviso !== null && initial?.sogliaAvviso !== undefined
      ? String(initial.sogliaAvviso)
      : "",
  );
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const payload = {
        nome,
        quantita: quantita ? parseFloat(quantita.replace(",", ".")) : null,
        unita: unita || null,
        sogliaAvviso: soglia ? parseFloat(soglia.replace(",", ".")) : null,
      };
      const res =
        mode === "create"
          ? await createScorta(payload)
          : await updateScorta(initial!.id, payload);
      if (res.ok) {
        show(mode === "create" ? "✓ Scorta aggiunta" : "✓ Modifiche salvate");
        onClose();
      } else show(res.error ?? "Ops, riprova!");
    });
  }

  function onDelete() {
    if (!initial) return;
    if (!window.confirm(`Eliminare "${initial.nome}"?`)) return;
    startTransition(async () => {
      const res = await deleteScorta(initial.id);
      if (res.ok) {
        show("Scorta eliminata");
        onClose();
      } else show("Ops, riprova!");
    });
  }

  return (
    <Modal
      title={mode === "create" ? "Nuova scorta" : "Modifica scorta"}
      onClose={onClose}
    >
      <form onSubmit={onSubmit}>
        <FormField label="Cosa stai tracciando?">
          <Input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            list="scorta-nomi"
            placeholder={`Es. "Mais", "Pellet bio"`}
            required
            autoFocus
          />
          <datalist id="scorta-nomi">
            {suggerimenti.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </FormField>

        <div className="grid grid-cols-2 gap-2">
          <FormField label="Quantità">
            <Input
              type="text"
              inputMode="decimal"
              value={quantita}
              onChange={(e) => setQuantita(e.target.value)}
              placeholder="es. 5"
            />
          </FormField>
          <FormField label="Unità">
            <Input
              value={unita}
              onChange={(e) => setUnita(e.target.value)}
              list="scorta-unita"
              placeholder="kg, sacchi..."
            />
            <datalist id="scorta-unita">
              {UNITA_FALLBACK.map((u) => (
                <option key={u} value={u} />
              ))}
            </datalist>
          </FormField>
        </div>

        <FormField label="Soglia avviso (opzionale)">
          <Input
            type="text"
            inputMode="decimal"
            value={soglia}
            onChange={(e) => setSoglia(e.target.value)}
            placeholder="Ti avviso quando scende sotto"
          />
        </FormField>

        <Button type="submit" fullWidth size="lg" disabled={!nome.trim() || pending}>
          {pending
            ? "Salvataggio..."
            : mode === "create"
              ? "Aggiungi scorta"
              : "Salva modifiche"}
        </Button>

        {mode === "edit" && (
          <button
            type="button"
            onClick={onDelete}
            disabled={pending}
            className="block w-full text-sm text-[#c0435a] font-semibold py-3 mt-2"
          >
            Elimina scorta
          </button>
        )}
      </form>
    </Modal>
  );
}

function RefillModal({
  scorta,
  onClose,
}: {
  scorta: ScortaItem;
  onClose: () => void;
}) {
  const { show } = useToast();
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const n = parseFloat(qty.replace(",", "."));
    if (Number.isNaN(n) || n <= 0) {
      show("Inserisci una quantità valida");
      return;
    }
    startTransition(async () => {
      const res = await rifornisciScorta(scorta.id, n, note || null);
      if (res.ok) {
        show(`✓ Rifornimento registrato: +${n}${scorta.unita ? ` ${scorta.unita}` : ""}`);
        onClose();
      } else show(res.error ?? "Ops, riprova!");
    });
  }

  return (
    <Modal title={`Rifornisci ${scorta.nome}`} onClose={onClose}>
      <form onSubmit={onSubmit}>
        <p className="text-sm text-[var(--text-secondary)] mb-3">
          Attualmente: <strong>{scorta.quantita ?? "—"} {scorta.unita ?? ""}</strong>
        </p>
        <FormField label="Quanto stai aggiungendo?">
          <Input
            type="text"
            inputMode="decimal"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            placeholder={scorta.unita ?? "Es. 5"}
            required
            autoFocus
          />
        </FormField>
        <FormField label="Note (opzionale)">
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={`Es. "Comprato dal contadino"`}
          />
        </FormField>
        <Button type="submit" fullWidth size="lg" disabled={!qty || pending}>
          {pending ? "Salvataggio..." : "Registra rifornimento"}
        </Button>
      </form>
    </Modal>
  );
}

function ConsumeModal({
  scorta,
  onClose,
}: {
  scorta: ScortaItem;
  onClose: () => void;
}) {
  const { show } = useToast();
  const [qty, setQty] = useState("");
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const n = parseFloat(qty.replace(",", "."));
    if (Number.isNaN(n) || n <= 0) {
      show("Inserisci una quantità valida");
      return;
    }
    startTransition(async () => {
      const res = await consumaScorta(scorta.id, n);
      if (res.ok) {
        show(`✓ Consumato −${n}${scorta.unita ? ` ${scorta.unita}` : ""}`);
        onClose();
      } else show(res.error ?? "Ops, riprova!");
    });
  }

  return (
    <Modal title={`Consuma ${scorta.nome}`} onClose={onClose}>
      <form onSubmit={onSubmit}>
        <p className="text-sm text-[var(--text-secondary)] mb-3">
          Attualmente: <strong>{scorta.quantita ?? "—"} {scorta.unita ?? ""}</strong>
        </p>
        <FormField label="Quanto stai consumando?">
          <Input
            type="text"
            inputMode="decimal"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            placeholder={scorta.unita ?? "Es. 1"}
            required
            autoFocus
          />
        </FormField>
        <Button type="submit" fullWidth size="lg" disabled={!qty || pending}>
          {pending ? "Salvataggio..." : "Registra consumo"}
        </Button>
      </form>
    </Modal>
  );
}

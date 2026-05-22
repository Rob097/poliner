"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { FormField } from "@/components/ui/FormField";
import { Input, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { IconPlus, IconEdit } from "@/components/ui/icons";
import { createNido, deleteNido, updateNido } from "../actions";

export interface NidoItem {
  id: string;
  nome: string;
  note: string | null;
  uovaSettimana: number;
}

export function NidiManager({ items }: { items: NidoItem[] }) {
  const [editing, setEditing] = useState<NidoItem | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <>
      {items.length === 0 ? (
        <EmptyState
          icon="🪺"
          title="Nessun nido configurato"
          subtitle="Aggiungi i nidi del tuo pollaio per tracciare dove le galline depongono."
          action="Aggiungi primo nido"
          onAction={() => setCreating(true)}
        />
      ) : (
        <>
          <div className="flex flex-col gap-2">
            {items.map((n) => (
              <Card key={n.id} className="flex items-center gap-3">
                <span className="text-2xl">🪺</span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[15px]">{n.nome}</div>
                  {n.note && (
                    <div className="text-xs text-(--text-secondary) truncate">
                      {n.note}
                    </div>
                  )}
                  <div className="text-[11px] text-(--text-secondary) mt-0.5">
                    {n.uovaSettimana} uova ultimi 7 giorni
                  </div>
                </div>
                <Button
                  variant="icon"
                  onClick={() => setEditing(n)}
                  aria-label="Modifica"
                >
                  <IconEdit size={18} color="var(--text-secondary)" />
                </Button>
              </Card>
            ))}
          </div>

          <Button fullWidth className="mt-4" onClick={() => setCreating(true)}>
            <IconPlus size={18} /> Aggiungi nido
          </Button>
        </>
      )}

      {creating && (
        <NidoFormModal mode="create" onClose={() => setCreating(false)} />
      )}
      {editing && (
        <NidoFormModal
          mode="edit"
          initial={editing}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}

function NidoFormModal({
  mode,
  initial,
  onClose,
}: {
  mode: "create" | "edit";
  initial?: NidoItem;
  onClose: () => void;
}) {
  const { show } = useToast();
  const [nome, setNome] = useState(initial?.nome ?? "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const payload = { nome, note: note || null };
      const res =
        mode === "create"
          ? await createNido(payload)
          : await updateNido(initial!.id, payload);
      if (res.ok) {
        show(mode === "create" ? "✓ Nido aggiunto" : "✓ Modifiche salvate");
        onClose();
      } else {
        show(res.error ?? "Ops, riprova!");
      }
    });
  }

  function onDelete() {
    if (!initial) return;
    const confirmed = window.confirm(
      `Eliminare "${initial.nome}"? Le uova associate resteranno ma senza nido.`,
    );
    if (!confirmed) return;
    startTransition(async () => {
      const res = await deleteNido(initial.id);
      if (res.ok) {
        show("Nido eliminato");
        onClose();
      } else {
        show("Ops, riprova!");
      }
    });
  }

  return (
    <Modal
      title={mode === "create" ? "Nuovo nido" : initial?.nome ?? "Modifica nido"}
      onClose={onClose}
    >
      <form onSubmit={onSubmit}>
        <FormField label="Nome">
          <Input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder={`Es. "Nido Finestra"`}
            required
            autoFocus
          />
        </FormField>
        <FormField label="Note (opzionale)">
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Es. Il preferito di Bianca"
          />
        </FormField>

        <Button
          type="submit"
          fullWidth
          size="lg"
          disabled={!nome.trim() || pending}
        >
          {pending
            ? "Salvataggio..."
            : mode === "create"
              ? "Aggiungi nido"
              : "Salva"}
        </Button>

        {mode === "edit" && (
          <button
            type="button"
            onClick={onDelete}
            disabled={pending}
            className="block w-full text-sm text-[#c0435a] font-semibold py-3 mt-2"
          >
            Elimina nido
          </button>
        )}
      </form>
    </Modal>
  );
}

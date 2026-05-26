"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { FormField } from "@/components/ui/FormField";
import { Input, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { IconPlus, IconChevron } from "@/components/ui/icons";
import { avatarBgFor } from "@/lib/utils/avatar";
import { formatData } from "@/lib/utils/date";
import { createContatto, deleteContatto, updateContatto } from "./actions";
import { usePagination } from "@/lib/hooks/usePagination";
import { LoadMoreButton } from "@/components/ui/LoadMoreButton";

export interface ContattoItem {
  id: string;
  nome: string;
  relazione: string | null;
  telefono: string | null;
  note: string | null;
  totale: number;
  volte: number;
  ultimaData: string | null;
}

export function RubricaClient({ items }: { items: ContattoItem[] }) {
  const [creating, setCreating] = useState(false);

  const sorted = useMemo(
    () => [...items].sort((a, b) => b.totale - a.totale),
    [items],
  );

  const { visible, hasMore, remaining, loadMore } = usePagination(sorted);

  return (
    <>
      <Button fullWidth onClick={() => setCreating(true)} className="mt-2">
        <IconPlus size={18} /> Aggiungi contatto
      </Button>

      {items.length === 0 ? (
        <EmptyState
          icon="👥"
          title="Nessun contatto ancora"
          subtitle="Aggiungi le persone a cui regali le uova: amici, vicini, familiari."
        />
      ) : (
        <>
          <div className="flex flex-col gap-2 mt-3">
            {visible.map((c, i) => (
              <Link key={c.id} href={`/rubrica/${c.id}`}>
                <Card clickable className="flex items-center gap-3">
                  <Avatar
                    name={c.nome}
                    size={48}
                    bg={avatarBgFor(c.id + String(i))}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-[15px] truncate">
                      {c.nome}
                    </div>
                    <div className="text-xs text-(--text-secondary) truncate">
                      {[
                        c.relazione,
                        c.totale > 0
                          ? `${c.totale} uova in ${c.volte} regal${c.volte === 1 ? "o" : "i"}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                    {c.ultimaData && (
                      <div className="text-[11px] text-(--text-secondary) mt-0.5">
                        Ultimo regalo: {formatData(c.ultimaData)}
                      </div>
                    )}
                  </div>
                  <IconChevron size={18} color="var(--text-secondary)" />
                </Card>
              </Link>
            ))}
          </div>
          {hasMore && <LoadMoreButton onClick={loadMore} remaining={remaining} />}
        </>
      )}

      {creating && (
        <ContattoFormModal
          onClose={() => setCreating(false)}
          mode="create"
        />
      )}
    </>
  );
}

interface ContattoFormProps {
  onClose: () => void;
  mode: "create" | "edit";
  initial?: ContattoItem;
}

function ContattoFormModal({ onClose, mode, initial }: ContattoFormProps) {
  const { show } = useToast();
  const [nome, setNome] = useState(initial?.nome ?? "");
  const [relazione, setRelazione] = useState(initial?.relazione ?? "");
  const [telefono, setTelefono] = useState(initial?.telefono ?? "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const payload = {
        nome,
        relazione: relazione || null,
        telefono: telefono || null,
        note: note || null,
      };
      const res =
        mode === "create"
          ? await createContatto(payload)
          : await updateContatto(initial!.id, payload);
      if (res.ok) {
        show(mode === "create" ? "✓ Contatto aggiunto" : "✓ Modifiche salvate");
        onClose();
      } else {
        show(res.error ?? "Ops, riprova!");
      }
    });
  }

  function onDelete() {
    if (!initial) return;
    const confirmed = window.confirm(
      `Eliminare ${initial.nome}? Lo storico regali resterà ma senza nome.`,
    );
    if (!confirmed) return;
    startTransition(async () => {
      const res = await deleteContatto(initial.id);
      if (res.ok) {
        show("Contatto eliminato");
        onClose();
      } else {
        show("Ops, riprova!");
      }
    });
  }

  return (
    <Modal
      title={mode === "create" ? "Nuovo contatto" : initial?.nome ?? "Contatto"}
      onClose={onClose}
    >
      <form onSubmit={onSubmit}>
        <FormField label="Nome">
          <Input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder={`Es. "Nonna Maria"`}
            required
            autoFocus
          />
        </FormField>
        <FormField label="Relazione (opzionale)">
          <Input
            value={relazione}
            onChange={(e) => setRelazione(e.target.value)}
            placeholder="Es. nonna, vicina, collega"
          />
        </FormField>
        <FormField label="Telefono (opzionale)">
          <Input
            type="tel"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            placeholder="+39 333 1234567"
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
          disabled={!nome.trim() || pending}
        >
          {pending
            ? "Salvataggio..."
            : mode === "create"
              ? "Aggiungi contatto"
              : "Salva modifiche"}
        </Button>

        {mode === "edit" && (
          <button
            type="button"
            onClick={onDelete}
            disabled={pending}
            className="block w-full text-sm text-[#c0435a] font-semibold py-3 mt-2"
          >
            Elimina contatto
          </button>
        )}
      </form>
    </Modal>
  );
}

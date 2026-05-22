"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Input, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { deleteContatto, updateContatto } from "../actions";

interface Contatto {
  id: string;
  nome: string;
  relazione: string | null;
  telefono: string | null;
  note: string | null;
}

export function ContattoActions({ contatto }: { contatto: Contatto }) {
  const [editing, setEditing] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="block w-full text-sm text-(--text-secondary) py-3 mt-4"
      >
        Modifica contatto
      </button>

      {editing && (
        <EditModal contatto={contatto} onClose={() => setEditing(false)} />
      )}
    </>
  );
}

function EditModal({
  contatto,
  onClose,
}: {
  contatto: Contatto;
  onClose: () => void;
}) {
  const router = useRouter();
  const { show } = useToast();
  const [nome, setNome] = useState(contatto.nome);
  const [relazione, setRelazione] = useState(contatto.relazione ?? "");
  const [telefono, setTelefono] = useState(contatto.telefono ?? "");
  const [note, setNote] = useState(contatto.note ?? "");
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await updateContatto(contatto.id, {
        nome,
        relazione: relazione || null,
        telefono: telefono || null,
        note: note || null,
      });
      if (res.ok) {
        show("✓ Modifiche salvate");
        onClose();
        router.refresh();
      } else show(res.error ?? "Ops, riprova!");
    });
  }

  function onDelete() {
    if (!window.confirm(`Eliminare ${contatto.nome}? Lo storico regali resterà ma senza nome.`)) return;
    startTransition(async () => {
      const res = await deleteContatto(contatto.id);
      if (res.ok) {
        show("Contatto eliminato");
        router.push("/rubrica");
        router.refresh();
      } else show("Ops, riprova!");
    });
  }

  return (
    <Modal title="Modifica contatto" onClose={onClose}>
      <form onSubmit={onSubmit}>
        <FormField label="Nome">
          <Input value={nome} onChange={(e) => setNome(e.target.value)} required />
        </FormField>
        <FormField label="Relazione (opzionale)">
          <Input value={relazione} onChange={(e) => setRelazione(e.target.value)} />
        </FormField>
        <FormField label="Telefono (opzionale)">
          <Input
            type="tel"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
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
          {pending ? "Salvataggio..." : "Salva modifiche"}
        </Button>

        <button
          type="button"
          onClick={onDelete}
          disabled={pending}
          className="block w-full text-sm text-[#c0435a] font-semibold py-3 mt-2"
        >
          Elimina contatto
        </button>
      </form>
    </Modal>
  );
}

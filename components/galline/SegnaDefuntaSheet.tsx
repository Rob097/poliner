"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";
import { useToast } from "@/components/ui/Toast";
import {
  hideLoadingOverlay,
  showLoadingOverlay,
} from "@/components/layout/NavigationOverlay";
import { segnaAnimaleDefunto } from "@/app/(app)/galline/actions";

interface Props {
  animaleId: string;
  animaleNome: string;
  onClose: () => void;
  onConfirmed: () => void;
}

export function SegnaDefuntaSheet({ animaleId, animaleNome, onClose, onConfirmed }: Props) {
  const { show } = useToast();
  const today = new Date().toISOString().slice(0, 10);
  const [data, setData] = useState(today);
  const [causa, setCausa] = useState("");
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    showLoadingOverlay();
    startTransition(async () => {
      const res = await segnaAnimaleDefunto({
        animaleId,
        defuntaIl: data,
        causa: causa || null,
        note: note || null,
      });
      if (res.ok) {
        onConfirmed();
      } else {
        show(res.error ?? "Ops, riprova!");
      }
      hideLoadingOverlay();
    });
  }

  return (
    <Modal title={`Segna ${animaleNome} come defunta`} onClose={onClose}>
      <p className="text-sm text-[var(--text-secondary)] mb-4 leading-relaxed">
        Lo storico (uova, salute, foto) resterà intatto e visibile nelle statistiche.
        {animaleNome} sarà spostata nella sezione “In memoria”.
      </p>

      <form onSubmit={onSubmit}>
        <FormField label="Data del decesso">
          <Input
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            max={today}
            required
          />
        </FormField>

        <FormField label="Causa (opzionale)">
          <Input
            value={causa}
            onChange={(e) => setCausa(e.target.value)}
            placeholder="Es. vecchiaia, predatore, malattia…"
          />
        </FormField>

        <FormField label="Note (opzionale)">
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Qualcosa da ricordare…"
          />
        </FormField>

        <div className="flex gap-2 mt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            className="flex-1"
            disabled={pending}
          >
            Annulla
          </Button>
          <Button
            type="submit"
            size="lg"
            disabled={pending}
            className="flex-[2]"
            style={{ background: "#c0435a" }}
          >
            {pending ? "Sto salvando…" : "Conferma"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

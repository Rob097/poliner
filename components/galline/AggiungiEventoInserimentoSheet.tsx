"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";
import { useToast } from "@/components/ui/Toast";
import {
  hideLoadingOverlay,
  showLoadingOverlay,
} from "@/components/layout/NavigationOverlay";
import {
  aggiungiEventoInserimento,
  type TipoEventoInserimento,
} from "@/app/(app)/galline/actions";

export const INSERIMENTO_LABEL: Record<TipoEventoInserimento, { label: string; icona: string }> = {
  quarantena_inizio: { label: "Quarantena iniziata", icona: "🔒" },
  quarantena_fine: { label: "Quarantena finita", icona: "🔓" },
  presentazione_visiva_inizio: { label: "Presentazione visiva iniziata", icona: "👀" },
  presentazione_visiva_fine: { label: "Presentazione visiva finita", icona: "👥" },
  convivenza_inizio: { label: "Convivenza iniziata", icona: "🏠" },
  completato: { label: "Inserimento completato", icona: "✅" },
  nota: { label: "Nota libera", icona: "📝" },
};

const TIPI_ORDINE: TipoEventoInserimento[] = [
  "quarantena_inizio",
  "quarantena_fine",
  "presentazione_visiva_inizio",
  "presentazione_visiva_fine",
  "convivenza_inizio",
  "completato",
  "nota",
];

interface Props {
  animaleId: string;
  onClose: () => void;
}

export function AggiungiEventoInserimentoSheet({ animaleId, onClose }: Props) {
  const { show } = useToast();
  const today = new Date().toISOString().slice(0, 10);
  const [tipo, setTipo] = useState<TipoEventoInserimento>("quarantena_inizio");
  const [data, setData] = useState(today);
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    showLoadingOverlay();
    startTransition(async () => {
      const res = await aggiungiEventoInserimento({
        animaleId,
        tipo,
        data,
        note: note || null,
      });
      if (res.ok) {
        show("✓ Evento registrato");
        onClose();
      } else {
        show(res.error ?? "Ops, riprova!");
      }
      hideLoadingOverlay();
    });
  }

  return (
    <Modal title="Aggiungi evento di inserimento" onClose={onClose}>
      <form onSubmit={onSubmit}>
        <FormField label="Tipo di evento">
          <Select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoEventoInserimento)}
          >
            {TIPI_ORDINE.map((t) => (
              <option key={t} value={t}>
                {INSERIMENTO_LABEL[t].icona} {INSERIMENTO_LABEL[t].label}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label="Data">
          <Input
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            max={today}
            required
          />
        </FormField>

        <FormField label="Note (opzionale)">
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Aggiungi un dettaglio o un'osservazione…"
          />
        </FormField>

        <Button type="submit" size="lg" fullWidth disabled={pending} className="mt-2">
          {pending ? "Sto salvando…" : "Aggiungi evento"}
        </Button>
      </form>
    </Modal>
  );
}

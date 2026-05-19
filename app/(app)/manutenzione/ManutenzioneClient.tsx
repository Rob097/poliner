"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FormField } from "@/components/ui/FormField";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { useToast } from "@/components/ui/Toast";
import { IconEdit, IconPlus, IconTrash } from "@/components/ui/icons";
import { TIPI_MANUTENZIONE, type TipoManutenzioneId } from "@/lib/constants/manutenzione";
import { colorePerStato, labelStato, type StatoTipo } from "@/lib/utils/manutenzione";
import { formatData, etichettaGiornoRelativo } from "@/lib/utils/date";
import {
  aggiornaFrequenza,
  eliminaIntervento,
  registraIntervento,
  ripristinaFrequenza,
} from "./actions";

interface LogEntry {
  id: string;
  tipo: TipoManutenzioneId;
  tipoNome: string;
  icona: string;
  data: string;
  note: string | null;
}

interface Props {
  stati: StatoTipo[];
  ultimi: LogEntry[];
  customFreq: Record<string, number>;
}

export function ManutenzioneClient({ stati, ultimi, customFreq }: Props) {
  const [showRegistra, setShowRegistra] = useState<TipoManutenzioneId | null>(null);
  const [editFreq, setEditFreq] = useState<StatoTipo | null>(null);

  return (
    <>
      <SectionTitle>Stato attuale</SectionTitle>
      <div className="flex flex-col gap-2">
        {stati.map((s) => (
          <StatoRow
            key={s.tipo.id}
            stato={s}
            customFreq={customFreq[s.tipo.id] !== undefined}
            onRegistra={() => setShowRegistra(s.tipo.id)}
            onEditFreq={() => setEditFreq(s)}
          />
        ))}
      </div>

      <SectionTitle>Ultimi interventi</SectionTitle>
      {ultimi.length === 0 ? (
        <Card>
          <p className="text-sm text-[var(--text-secondary)] text-center py-2">
            Nessun intervento registrato ancora
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-1.5">
          {ultimi.map((l) => (
            <LogRow key={l.id} log={l} />
          ))}
        </div>
      )}

      <Button fullWidth className="mt-4" onClick={() => setShowRegistra(stati[0]?.tipo.id ?? null)}>
        <IconPlus size={18} /> Registra intervento
      </Button>

      {showRegistra && (
        <RegistraInterventoModal
          tipoIniziale={showRegistra}
          onClose={() => setShowRegistra(null)}
        />
      )}
      {editFreq && (
        <EditFrequenzaModal
          stato={editFreq}
          custom={customFreq[editFreq.tipo.id] !== undefined}
          onClose={() => setEditFreq(null)}
        />
      )}
    </>
  );
}

function StatoRow({
  stato,
  customFreq,
  onRegistra,
  onEditFreq,
}: {
  stato: StatoTipo;
  customFreq: boolean;
  onRegistra: () => void;
  onEditFreq: () => void;
}) {
  const colore = colorePerStato(stato.stato);
  const giorniLabel =
    stato.ultimoIntervento === null
      ? "Mai registrato"
      : `Ultimo: ${etichettaGiornoRelativo(stato.ultimoIntervento)}`;

  return (
    <Card style={{ borderLeft: `4px solid ${colore}` }}>
      <div className="flex justify-between items-start gap-3">
        <div className="flex gap-2.5 items-start min-w-0">
          <span className="text-xl">{stato.tipo.icona}</span>
          <div className="min-w-0">
            <div className="font-semibold text-sm">{stato.tipo.nome}</div>
            <div className="text-xs text-[var(--text-secondary)]">
              {stato.tipo.dove} · Ogni {stato.frequenza} giorni
              {customFreq && (
                <span className="ml-1 text-[var(--primary)]">(personalizzato)</span>
              )}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onEditFreq}
          className="flex-shrink-0 text-[var(--text-secondary)]"
          aria-label="Modifica frequenza"
        >
          <IconEdit size={16} />
        </button>
      </div>
      <div className="mt-2 flex justify-between items-center gap-2">
        <span className="text-xs text-[var(--text-secondary)]">{giorniLabel}</span>
        <Badge
          small
          bg={stato.stato === "scaduta" ? "#FFD6E0" : stato.stato === "in_scadenza" ? "#FFE07A44" : "#B5D4B533"}
          color={stato.stato === "scaduta" ? "#c0435a" : stato.stato === "in_scadenza" ? "#8a7020" : "#3d6b3d"}
        >
          {labelStato(stato)}
        </Badge>
      </div>
      <div className="mt-2 h-1 bg-[var(--border)] rounded overflow-hidden">
        <div
          className="h-full rounded transition-all duration-500"
          style={{
            width: `${Math.min(100, (stato.giorniDaUltimo / stato.frequenza) * 100)}%`,
            background: colore,
          }}
        />
      </div>
      <Button
        size="md"
        variant="secondary"
        onClick={onRegistra}
        className="text-xs px-3 py-2 mt-2"
      >
        ✓ Fatto oggi
      </Button>
    </Card>
  );
}

function LogRow({ log }: { log: LogEntry }) {
  const { show } = useToast();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  function onDelete() {
    const confirmed = window.confirm("Eliminare questo intervento?");
    if (!confirmed) return;
    startTransition(async () => {
      const res = await eliminaIntervento(log.id);
      if (res.ok) show("Intervento eliminato");
      else show("Ops, riprova!");
    });
  }

  return (
    <Card className="flex items-center gap-3 py-2.5 px-3.5">
      <span className="text-lg">{log.icona}</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold truncate">{log.tipoNome}</div>
        <div className="text-xs text-[var(--text-secondary)] truncate">
          {formatData(log.data)}
          {log.note ? ` · ${log.note}` : ""}
        </div>
      </div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="text-xs text-[var(--text-secondary)]"
      >
        {open ? "✕" : "•••"}
      </button>
      {open && (
        <button
          type="button"
          onClick={onDelete}
          disabled={pending}
          className="text-[#c0435a]"
          aria-label="Elimina"
        >
          <IconTrash size={16} />
        </button>
      )}
    </Card>
  );
}

function RegistraInterventoModal({
  tipoIniziale,
  onClose,
}: {
  tipoIniziale: TipoManutenzioneId;
  onClose: () => void;
}) {
  const { show } = useToast();
  const [tipo, setTipo] = useState<TipoManutenzioneId>(tipoIniziale);
  const defaultDateTime = (() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  })();
  const [data, setData] = useState(defaultDateTime);
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await registraIntervento({
        tipo,
        data: new Date(data).toISOString(),
        note: note || null,
      });
      if (res.ok) {
        show("✓ Intervento registrato!");
        onClose();
      } else {
        show(res.error ?? "Ops, riprova!");
      }
    });
  }

  return (
    <Modal title="Registra intervento" onClose={onClose}>
      <form onSubmit={onSubmit}>
        <FormField label="Tipo">
          <Select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoManutenzioneId)}
          >
            {TIPI_MANUTENZIONE.map((t) => (
              <option key={t.id} value={t.id}>
                {t.icona} {t.nome}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Data e ora">
          <Input
            type="datetime-local"
            value={data}
            onChange={(e) => setData(e.target.value)}
            required
          />
        </FormField>
        <FormField label="Note (opzionale)">
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder={`Es. "Aggiunta terra di diatomea"`}
          />
        </FormField>
        <Button type="submit" fullWidth size="lg" disabled={pending}>
          {pending ? "Salvataggio..." : "Registra intervento"}
        </Button>
      </form>
    </Modal>
  );
}

function EditFrequenzaModal({
  stato,
  custom,
  onClose,
}: {
  stato: StatoTipo;
  custom: boolean;
  onClose: () => void;
}) {
  const { show } = useToast();
  const [freq, setFreq] = useState(stato.frequenza);
  const [pending, startTransition] = useTransition();

  function onSave(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await aggiornaFrequenza(stato.tipo.id, freq);
      if (res.ok) {
        show("✓ Frequenza aggiornata");
        onClose();
      } else show(res.error ?? "Ops, riprova!");
    });
  }

  function onReset() {
    startTransition(async () => {
      const res = await ripristinaFrequenza(stato.tipo.id);
      if (res.ok) {
        show("✓ Frequenza ripristinata");
        onClose();
      } else show("Ops, riprova!");
    });
  }

  return (
    <Modal title={`Frequenza · ${stato.tipo.nome}`} onClose={onClose}>
      <form onSubmit={onSave}>
        <p className="text-sm text-[var(--text-secondary)] mb-3">
          Default consigliato: <strong>{stato.tipo.frequenzaDefault} giorni</strong>.
        </p>
        <FormField label="Ogni quanti giorni?">
          <Input
            type="number"
            min={1}
            max={365}
            value={freq}
            onChange={(e) => setFreq(parseInt(e.target.value, 10) || 1)}
            required
          />
        </FormField>
        <Button type="submit" fullWidth size="lg" disabled={pending}>
          {pending ? "Salvataggio..." : "Salva"}
        </Button>
        {custom && (
          <button
            type="button"
            onClick={onReset}
            disabled={pending}
            className="block w-full text-sm text-[var(--text-secondary)] py-3 mt-2"
          >
            Ripristina default ({stato.tipo.frequenzaDefault} giorni)
          </button>
        )}
      </form>
    </Modal>
  );
}

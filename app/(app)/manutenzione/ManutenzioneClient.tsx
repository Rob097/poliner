"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { FormField } from "@/components/ui/FormField";
import { Input, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { useToast } from "@/components/ui/Toast";
import { IconEdit, IconTrash } from "@/components/ui/icons";
import type { ConsiglioManutenzione } from "@/lib/constants/manutenzione";
import { colorePerStato, labelStato, type StatoVoce } from "@/lib/utils/manutenzione";
import { formatData, etichettaGiornoRelativo } from "@/lib/utils/date";
import {
  aggiornaVoce,
  creaVoce,
  disattivaVoce,
  eliminaIntervento,
  registraIntervento,
} from "./actions";

interface LogEntry {
  id: string;
  voceId: string;
  voceNome: string;
  icona: string;
  data: string;
  note: string | null;
}

interface VoceForm {
  nome: string;
  dove: string;
  icona: string;
  frequenzaGiorni: number;
  note: string;
  consiglioId: string | null;
}

interface Props {
  ruolo: "admin" | "guest";
  stati: StatoVoce[];
  consigli: ConsiglioManutenzione[];
  ultimi: LogEntry[];
}

const VOCE_FORM_DEFAULT: VoceForm = {
  nome: "",
  dove: "",
  icona: "🧹",
  frequenzaGiorni: 7,
  note: "",
  consiglioId: null,
};

export function ManutenzioneClient({ ruolo, stati, consigli, ultimi }: Props) {
  const isAdmin = ruolo === "admin";
  const [showRegistra, setShowRegistra] = useState<StatoVoce | null>(null);
  const [showVoceForm, setShowVoceForm] = useState<{
    mode: "create" | "edit";
    initial: VoceForm;
    editingId?: string;
  } | null>(null);

  return (
    <>
      <SectionTitle>Le mie manutenzioni</SectionTitle>
      {stati.length === 0 ? (
        <EmptyState
          icon="🧹"
          title="Nessuna voce di manutenzione"
          subtitle={
            isAdmin
              ? "Tocca un consiglio qui sotto per iniziare, o crea una voce custom."
              : "Gli admin non hanno ancora aggiunto voci di manutenzione."
          }
        />
      ) : (
        <div className="flex flex-col gap-2">
          {stati.map((s) => (
            <StatoRow
              key={s.voce.id}
              stato={s}
              isAdmin={isAdmin}
              onRegistra={() => setShowRegistra(s)}
              onEdit={() =>
                setShowVoceForm({
                  mode: "edit",
                  editingId: s.voce.id,
                  initial: {
                    nome: s.voce.nome,
                    dove: s.voce.dove ?? "",
                    icona: s.voce.icona,
                    frequenzaGiorni: s.voce.frequenza_giorni,
                    note: "",
                    consiglioId: s.voce.consiglio_id,
                  },
                })
              }
            />
          ))}
        </div>
      )}

      {isAdmin && consigli.length > 0 && (
        <>
          <SectionTitle>Consigli</SectionTitle>
          <p className="text-xs text-(--text-secondary) -mt-1 mb-2">
            Tocca un consiglio per aggiungerlo. Puoi personalizzarlo prima di salvare.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {consigli.map((c) => (
              <ConsiglioBadge
                key={c.id}
                consiglio={c}
                onClick={() =>
                  setShowVoceForm({
                    mode: "create",
                    initial: {
                      nome: c.nome,
                      dove: c.dove,
                      icona: c.icona,
                      frequenzaGiorni: c.frequenzaDefault,
                      note: "",
                      consiglioId: c.id,
                    },
                  })
                }
              />
            ))}
          </div>
        </>
      )}

      {isAdmin && (
        <Button
          variant="secondary"
          fullWidth
          className="mt-4"
          onClick={() =>
            setShowVoceForm({ mode: "create", initial: VOCE_FORM_DEFAULT })
          }
        >
          + Crea voce custom
        </Button>
      )}

      <SectionTitle>Ultimi interventi</SectionTitle>
      {ultimi.length === 0 ? (
        <Card>
          <p className="text-sm text-(--text-secondary) text-center py-2 m-0">
            Nessun intervento registrato ancora
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-1.5">
          {ultimi.map((l) => (
            <LogRow key={l.id} log={l} isAdmin={isAdmin} />
          ))}
        </div>
      )}

      {showRegistra && (
        <RegistraInterventoModal
          stato={showRegistra}
          onClose={() => setShowRegistra(null)}
        />
      )}

      {showVoceForm && (
        <VoceModal
          mode={showVoceForm.mode}
          editingId={showVoceForm.editingId}
          initial={showVoceForm.initial}
          onClose={() => setShowVoceForm(null)}
        />
      )}
    </>
  );
}

function StatoRow({
  stato,
  isAdmin,
  onRegistra,
  onEdit,
}: {
  stato: StatoVoce;
  isAdmin: boolean;
  onRegistra: () => void;
  onEdit: () => void;
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
          <span className="text-xl">{stato.voce.icona}</span>
          <div className="min-w-0">
            <div className="font-semibold text-sm">{stato.voce.nome}</div>
            <div className="text-xs text-(--text-secondary)">
              {stato.voce.dove ? `${stato.voce.dove} · ` : ""}Ogni {stato.voce.frequenza_giorni} giorni
            </div>
          </div>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={onEdit}
            className="shrink-0 text-(--text-secondary)"
            aria-label="Modifica voce"
          >
            <IconEdit size={16} />
          </button>
        )}
      </div>
      <div className="mt-2 flex justify-between items-center gap-2">
        <span className="text-xs text-(--text-secondary)">{giorniLabel}</span>
        <Badge
          small
          bg={
            stato.stato === "scaduta"
              ? "#FFD6E0"
              : stato.stato === "in_scadenza"
                ? "#FFE07A44"
                : "#B5D4B533"
          }
          color={
            stato.stato === "scaduta"
              ? "#c0435a"
              : stato.stato === "in_scadenza"
                ? "#8a7020"
                : "#3d6b3d"
          }
        >
          {labelStato(stato)}
        </Badge>
      </div>
      <div className="mt-2 h-1 bg-(--border) rounded overflow-hidden">
        <div
          className="h-full rounded transition-all duration-500"
          style={{
            width: `${Math.min(100, (stato.giorniDaUltimo / stato.voce.frequenza_giorni) * 100)}%`,
            background: colore,
          }}
        />
      </div>
      {isAdmin && (
        <Button
          size="md"
          variant="secondary"
          onClick={onRegistra}
          className="text-xs px-3 py-2 mt-2"
        >
          ✓ Fatto oggi
        </Button>
      )}
    </Card>
  );
}

function ConsiglioBadge({
  consiglio,
  onClick,
}: {
  consiglio: ConsiglioManutenzione;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left bg-white border border-(--border) rounded-sm px-3 py-2.5 hover:bg-(--bg-warm) active:scale-[0.98] transition-transform"
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xl">{consiglio.icona}</span>
        <span className="text-xs text-(--text-secondary)">
          ogni {consiglio.frequenzaDefault} gg
        </span>
      </div>
      <div className="text-[13px] font-semibold leading-tight">{consiglio.nome}</div>
    </button>
  );
}

function LogRow({ log, isAdmin }: { log: LogEntry; isAdmin: boolean }) {
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
        <div className="text-sm font-semibold truncate">{log.voceNome}</div>
        <div className="text-xs text-(--text-secondary) truncate">
          {formatData(log.data)}
          {log.note ? ` · ${log.note}` : ""}
        </div>
      </div>
      {isAdmin && (
        <>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="text-xs text-(--text-secondary)"
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
        </>
      )}
    </Card>
  );
}

function RegistraInterventoModal({
  stato,
  onClose,
}: {
  stato: StatoVoce;
  onClose: () => void;
}) {
  const { show } = useToast();
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
        voceId: stato.voce.id,
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
    <Modal title={`${stato.voce.icona} ${stato.voce.nome}`} onClose={onClose}>
      <form onSubmit={onSubmit}>
        <FormField label="Quando l'hai fatto?">
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

function VoceModal({
  mode,
  editingId,
  initial,
  onClose,
}: {
  mode: "create" | "edit";
  editingId?: string;
  initial: VoceForm;
  onClose: () => void;
}) {
  const { show } = useToast();
  const [nome, setNome] = useState(initial.nome);
  const [dove, setDove] = useState(initial.dove);
  const [icona, setIcona] = useState(initial.icona);
  const [frequenzaGiorni, setFrequenzaGiorni] = useState(initial.frequenzaGiorni);
  const [note, setNote] = useState(initial.note);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      if (mode === "create") {
        const res = await creaVoce({
          nome,
          dove,
          icona,
          frequenzaGiorni,
          note,
          consiglioId: initial.consiglioId,
        });
        if (res.ok) {
          show("✓ Voce creata!");
          onClose();
        } else {
          show(res.error ?? "Ops, riprova!");
        }
      } else if (editingId) {
        const res = await aggiornaVoce(editingId, {
          nome,
          dove,
          icona,
          frequenzaGiorni,
          note,
        });
        if (res.ok) {
          show("✓ Voce aggiornata!");
          onClose();
        } else {
          show(res.error ?? "Ops, riprova!");
        }
      }
    });
  }

  function onDisattiva() {
    if (!editingId) return;
    const confirmed = window.confirm(
      "Disattivare questa voce? Lo storico log resta ma sparirà dagli avvisi.",
    );
    if (!confirmed) return;
    startTransition(async () => {
      const res = await disattivaVoce(editingId);
      if (res.ok) {
        show("Voce disattivata");
        onClose();
      } else {
        show(res.error ?? "Ops, riprova!");
      }
    });
  }

  return (
    <Modal
      title={mode === "create" ? "Nuova voce di manutenzione" : "Modifica voce"}
      onClose={onClose}
    >
      <form onSubmit={onSubmit}>
        <FormField label="Nome">
          <Input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder='Es. "Pulizia trespoli"'
            required
          />
        </FormField>
        <FormField label="Dove (opzionale)">
          <Input
            value={dove}
            onChange={(e) => setDove(e.target.value)}
            placeholder='Es. "Casetta interna"'
          />
        </FormField>
        <div className="grid grid-cols-[80px_1fr] gap-3">
          <FormField label="Icona">
            <Input
              value={icona}
              onChange={(e) => setIcona(e.target.value)}
              maxLength={2}
              className="text-center text-xl"
            />
          </FormField>
          <FormField label="Ogni quanti giorni?">
            <Input
              type="number"
              min={1}
              max={365}
              value={frequenzaGiorni}
              onChange={(e) =>
                setFrequenzaGiorni(parseInt(e.target.value, 10) || 1)
              }
              required
            />
          </FormField>
        </div>
        <FormField label="Note (opzionale)">
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder='Es. "Comprare nuova sabbia"'
          />
        </FormField>

        <Button type="submit" fullWidth size="lg" disabled={pending}>
          {pending ? "Salvataggio..." : mode === "create" ? "Crea voce" : "Salva modifiche"}
        </Button>

        {mode === "edit" && (
          <button
            type="button"
            onClick={onDisattiva}
            disabled={pending}
            className="block w-full text-sm text-[#c0435a] py-3 mt-2"
          >
            Disattiva voce
          </button>
        )}
      </form>
    </Modal>
  );
}

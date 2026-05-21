"use client";

import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { useToast } from "@/components/ui/Toast";
import { IconPlus } from "@/components/ui/icons";
import {
  hideLoadingOverlay,
  showLoadingOverlay,
} from "@/components/layout/NavigationOverlay";
import { etichettaGiornoRelativo, giorniFa, formatDataLunga } from "@/lib/utils/date";
import { eliminaEventoInserimento } from "@/app/(app)/galline/actions";
import type { TipoEventoInserimento } from "@/app/(app)/galline/actions";
import {
  AggiungiEventoInserimentoSheet,
  INSERIMENTO_LABEL,
} from "./AggiungiEventoInserimentoSheet";
import { InserimentoEducativo } from "./InserimentoEducativo";

export interface EventoInserimento {
  id: string;
  tipo: TipoEventoInserimento;
  data: string;
  note: string | null;
  foto_url: string | null;
}

interface Props {
  animaleId: string;
  eventi: EventoInserimento[];   // ordinati per data DESC
  readOnly: boolean;
}

export function InserimentoTab({ animaleId, eventi, readOnly }: Props) {
  const { show } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [pending, startTransition] = useTransition();

  const stato = useMemo(() => {
    if (eventi.length === 0) return { stato: "vuoto" as const };
    const completato = eventi.find((e) => e.tipo === "completato");
    if (completato) {
      return { stato: "completato" as const, data: completato.data };
    }
    // L'ultimo evento (più recente) detta la "fase"
    const ultimo = eventi[0];
    return {
      stato: "in_corso" as const,
      ultimo,
      giorni: giorniFa(ultimo.data),
    };
  }, [eventi]);

  function elimina(id: string) {
    if (!confirm("Eliminare questo evento dalla timeline?")) return;
    showLoadingOverlay();
    startTransition(async () => {
      const res = await eliminaEventoInserimento(id, animaleId);
      if (res.ok) show("✓ Evento eliminato");
      else show(res.error ?? "Ops, riprova!");
      hideLoadingOverlay();
    });
  }

  return (
    <div className="mt-3">
      {/* Banner stato corrente */}
      {stato.stato === "completato" && (
        <Card
          className="mb-3"
          style={{ background: "#B5D4B520", border: "1px solid #B5D4B566" }}
        >
          <div className="font-semibold text-sm">
            ✅ Inserimento completato
          </div>
          <div className="text-xs text-[var(--text-secondary)] mt-0.5">
            Dal {formatDataLunga(stato.data)}
          </div>
        </Card>
      )}
      {stato.stato === "in_corso" && (
        <Card
          className="mb-3"
          style={{ background: "#FFE07A22", border: "1px solid #FFE07A66" }}
        >
          <div className="font-semibold text-sm">
            🏠+→ In inserimento
          </div>
          <div className="text-xs text-[var(--text-secondary)] mt-0.5">
            Ultimo evento: {INSERIMENTO_LABEL[stato.ultimo.tipo].label.toLowerCase()}{" "}
            ({etichettaGiornoRelativo(stato.ultimo.data).toLowerCase()})
          </div>
        </Card>
      )}

      {/* Educativo (collapsible, sempre disponibile se la card non è nascosta) */}
      <InserimentoEducativo />

      {/* Timeline + add */}
      <SectionTitle
        right={
          readOnly ? undefined : (
            <button
              type="button"
              onClick={() => setShowAdd(true)}
              className="text-xs text-[var(--primary)] font-semibold flex items-center gap-1"
            >
              <IconPlus size={14} /> Aggiungi evento
            </button>
          )
        }
      >
        Timeline
      </SectionTitle>

      {eventi.length === 0 ? (
        <EmptyState
          icon="🏠"
          title="Nessun evento ancora"
          subtitle="Documenta l'inserimento aggiungendo eventi alla timeline (quarantena, presentazione, convivenza, note)."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {eventi.map((e) => (
            <EventoCard
              key={e.id}
              evento={e}
              onDelete={readOnly ? undefined : () => elimina(e.id)}
              pending={pending}
            />
          ))}
        </div>
      )}

      {showAdd && (
        <AggiungiEventoInserimentoSheet
          animaleId={animaleId}
          onClose={() => setShowAdd(false)}
        />
      )}
    </div>
  );
}

function EventoCard({
  evento,
  onDelete,
  pending,
}: {
  evento: EventoInserimento;
  onDelete?: () => void;
  pending: boolean;
}) {
  const meta = INSERIMENTO_LABEL[evento.tipo];
  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm flex items-center gap-1.5">
            <span aria-hidden>{meta.icona}</span>
            <span>{meta.label}</span>
          </div>
          <div className="text-xs text-[var(--text-secondary)] mt-0.5">
            {etichettaGiornoRelativo(evento.data)}
          </div>
          {evento.note && (
            <p className="text-sm text-text leading-relaxed mt-2 whitespace-pre-wrap m-0">
              {evento.note}
            </p>
          )}
        </div>
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            disabled={pending}
            className="text-[#c0435a] text-xs font-semibold"
            aria-label="Elimina evento"
          >
            Elimina
          </button>
        )}
      </div>
    </Card>
  );
}

// Per chi vuole montare il bottone aggiunta da fuori (es. FAB locale).
export function AggiungiEventoButton({ onClick }: { onClick: () => void }) {
  return (
    <Button onClick={onClick} fullWidth size="lg">
      <IconPlus size={16} /> Aggiungi evento
    </Button>
  );
}

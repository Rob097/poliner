"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FormField } from "@/components/ui/FormField";
import { Input, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { useToast } from "@/components/ui/Toast";
import {
  accettaRichiesta,
  annullaRichiesta,
  creaRichiestaUova,
  rifiutaRichiesta,
} from "@/lib/actions/richieste";
import { etichettaGiornoRelativo } from "@/lib/utils/date";

export interface RichiestaRow {
  id: string;
  quantita: number;
  nota: string | null;
  createdAt: string; // ISO
  richiedenteUserId: string;
  richiedenteNome: string;
  isMia: boolean;
}

interface Props {
  richieste: RichiestaRow[];
  uovaDisponibili: number;
  ruolo: "admin" | "guest";
}

export function RichiesteSection({ richieste, uovaDisponibili, ruolo }: Props) {
  const [showRichiediModal, setShowRichiediModal] = useState(false);
  const isAdmin = ruolo === "admin";

  return (
    <div className="px-4">
      <SectionTitle>
        {isAdmin ? "Richieste dai membri" : "Richieste in attesa"}
      </SectionTitle>

      {richieste.length === 0 ? (
        <Card>
          <p className="text-sm text-[var(--text-secondary)] text-center py-1 m-0">
            {isAdmin
              ? "Nessuna richiesta al momento."
              : "Nessuna richiesta in attesa."}
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {richieste.map((r) => (
            <RichiestaCard
              key={r.id}
              richiesta={r}
              isAdmin={isAdmin}
              uovaDisponibili={uovaDisponibili}
            />
          ))}
        </div>
      )}

      {!isAdmin && (
        <Button
          fullWidth
          className="mt-3"
          onClick={() => setShowRichiediModal(true)}
        >
          🙏 Vorrei delle uova
        </Button>
      )}

      {showRichiediModal && (
        <RichiediModal
          uovaDisponibili={uovaDisponibili}
          onClose={() => setShowRichiediModal(false)}
        />
      )}
    </div>
  );
}

function RichiestaCard({
  richiesta,
  isAdmin,
  uovaDisponibili,
}: {
  richiesta: RichiestaRow;
  isAdmin: boolean;
  uovaDisponibili: number;
}) {
  const router = useRouter();
  const { show } = useToast();
  const [isPending, startTransition] = useTransition();

  const handleAccetta = () => {
    if (uovaDisponibili < richiesta.quantita) {
      show(`Hai solo ${uovaDisponibili} uova disponibili.`);
      return;
    }
    startTransition(async () => {
      const res = await accettaRichiesta(richiesta.id);
      if (res.ok) {
        show("✓ Accettata");
        router.refresh();
      } else {
        show(res.error ?? "Ops, riprova!");
      }
    });
  };

  const handleRifiuta = () => {
    if (!confirm(`Rifiutare la richiesta di ${richiesta.richiedenteNome}?`)) return;
    startTransition(async () => {
      const res = await rifiutaRichiesta(richiesta.id);
      if (res.ok) {
        show("Rifiutata");
        router.refresh();
      } else {
        show(res.error ?? "Ops, riprova!");
      }
    });
  };

  const handleAnnulla = () => {
    if (!confirm("Annullare la tua richiesta?")) return;
    startTransition(async () => {
      const res = await annullaRichiesta(richiesta.id);
      if (res.ok) {
        show("Annullata");
        router.refresh();
      } else {
        show(res.error ?? "Ops, riprova!");
      }
    });
  };

  return (
    <Card className="flex flex-col gap-2 py-2.5 px-3.5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-[var(--primary-light)] flex items-center justify-center text-lg flex-shrink-0">
          🙏
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm">
            <span className="font-semibold">{richiesta.richiedenteNome}</span>
            {richiesta.isMia && (
              <span className="ml-1 text-xs text-[var(--text-secondary)] font-normal">
                (tu)
              </span>
            )}
            <span className="text-[var(--text-secondary)]">
              {" "}chiede {richiesta.quantita} uov{richiesta.quantita === 1 ? "o" : "a"}
            </span>
          </div>
          <div className="text-xs text-[var(--text-secondary)]">
            {etichettaGiornoRelativo(richiesta.createdAt)}
          </div>
          {richiesta.nota && (
            <div className="text-xs text-[var(--text-secondary)] italic mt-1">
              &ldquo;{richiesta.nota}&rdquo;
            </div>
          )}
        </div>
      </div>

      {isAdmin && (
        <div className="flex gap-2">
          <Button
            variant="secondary"
            fullWidth
            onClick={handleRifiuta}
            disabled={isPending}
            className="text-[#c0435a]"
          >
            Rifiuta
          </Button>
          <Button
            fullWidth
            onClick={handleAccetta}
            disabled={isPending}
          >
            ✓ Accetta
          </Button>
        </div>
      )}
      {!isAdmin && richiesta.isMia && (
        <button
          type="button"
          onClick={handleAnnulla}
          disabled={isPending}
          className="text-xs text-[var(--text-secondary)] self-start"
        >
          Annulla la mia richiesta
        </button>
      )}
    </Card>
  );
}

function RichiediModal({
  uovaDisponibili,
  onClose,
}: {
  uovaDisponibili: number;
  onClose: () => void;
}) {
  const router = useRouter();
  const { show } = useToast();
  const [quantita, setQuantita] = useState(1);
  const [nota, setNota] = useState("");
  const [errore, setErrore] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrore(null);
    if (quantita < 1) {
      setErrore("La quantità deve essere almeno 1.");
      return;
    }
    startTransition(async () => {
      const res = await creaRichiestaUova({
        quantita,
        nota: nota.trim() || null,
      });
      if (res.ok) {
        show("🙏 Richiesta inviata!");
        onClose();
        router.refresh();
      } else {
        setErrore(res.error ?? "Ops, riprova!");
      }
    });
  };

  return (
    <Modal title="🙏 Vorrei delle uova" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <p className="text-xs text-[var(--text-secondary)] m-0 mb-3">
          Disponibili nel pollaio:{" "}
          <b>{uovaDisponibili} uov{uovaDisponibili === 1 ? "o" : "a"}</b>
          {uovaDisponibili === 0 && " — chiedi pure, le riceverai appena ce ne saranno!"}
        </p>

        <FormField label="Quante uova vorresti?">
          <Input
            type="number"
            min={1}
            max={100}
            value={quantita}
            onChange={(e) => setQuantita(Math.max(1, parseInt(e.target.value, 10) || 1))}
            required
            autoFocus
          />
        </FormField>

        <FormField label="Per cosa? (opzionale)">
          <Textarea
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            rows={2}
            maxLength={200}
            placeholder='Es. "Per la torta di domenica"'
          />
        </FormField>

        {errore && <p className="text-[var(--primary)] text-sm m-0 mb-2">{errore}</p>}

        <Button type="submit" fullWidth size="lg" disabled={isPending}>
          {isPending ? "Invio..." : "Invia richiesta"}
        </Button>
      </form>
    </Modal>
  );
}

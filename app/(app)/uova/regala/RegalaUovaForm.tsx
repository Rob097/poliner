"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/ui/Header";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { FormField } from "@/components/ui/FormField";
import { Input, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { avatarBgFor } from "@/lib/utils/avatar";
import { cn } from "@/lib/utils/cn";
import { regalaUova } from "../actions";
import { createContatto } from "../../rubrica/actions";

export interface ContattoOption {
  id: string;
  nome: string;
  relazione: string | null;
  totale: number;
}

interface Props {
  contatti: ContattoOption[];
  disponibili: number;
}

export function RegalaUovaForm({ contatti, disponibili }: Props) {
  const router = useRouter();
  const { show } = useToast();

  const [contatti2, setContatti2] = useState(contatti);
  const [qty, setQty] = useState(Math.min(6, disponibili));
  const [contattoId, setContattoId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [showAddContact, setShowAddContact] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (disponibili === 0) {
    return (
      <ScreenContainer header={<Header title="Regala uova" onBack={() => router.back()} />}>
        <EmptyState
          icon="🥚"
          title="Nessun uovo disponibile"
          subtitle="Aggiungi qualche uovo prima di poterlo regalare."
          action="Aggiungi uovo"
          onAction={() => router.push("/uova/nuovo")}
        />
      </ScreenContainer>
    );
  }

  const contattoSelezionato = contatti2.find((c) => c.id === contattoId);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!contattoId) {
      setError("Scegli un contatto");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await regalaUova({
        contattoId,
        quantita: qty,
        note: note || null,
      });
      if (res.ok) {
        show("✓ Uova regalate! 🎁");
        router.push("/uova");
        router.refresh();
      } else {
        setError(res.error ?? "Ops, riprova!");
      }
    });
  }

  return (
    <>
      <ScreenContainer header={<Header title="Regala uova" onBack={() => router.back()} />}>
        <form onSubmit={onSubmit}>
          <div className="text-center my-3">
            <div className="text-6xl">🎁</div>
          </div>

          <FormField label="Quante uova vuoi regalare?">
            <div className="flex items-center justify-center gap-5">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                disabled={qty <= 1}
                className="w-11 h-11 rounded-full bg-(--primary-lighter) text-xl font-semibold flex items-center justify-center disabled:opacity-50"
                aria-label="Riduci"
              >
                −
              </button>
              <div className="text-4xl font-extrabold text-(--primary) min-w-[60px] text-center">
                {qty}
              </div>
              <button
                type="button"
                onClick={() => setQty((q) => Math.min(disponibili, q + 1))}
                disabled={qty >= disponibili}
                className="w-11 h-11 rounded-full bg-(--primary-lighter) text-xl font-semibold flex items-center justify-center disabled:opacity-50"
                aria-label="Aumenta"
              >
                +
              </button>
            </div>
            <div className="text-center text-[13px] text-(--text-secondary) mt-1">
              {disponibili} disponibili
            </div>
          </FormField>

          <FormField label="A chi?">
            {contatti2.length === 0 ? (
              <Card className="text-center py-5">
                <p className="text-sm text-(--text-secondary) mb-3">
                  Nessun contatto in rubrica.
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowAddContact(true)}
                >
                  + Aggiungi contatto
                </Button>
              </Card>
            ) : (
              <div className="flex flex-col gap-2">
                {contatti2.map((c, i) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setContattoId(c.id)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-(--radius) border-2 cursor-pointer text-left transition-all",
                      contattoId === c.id
                        ? "bg-(--primary-lighter) border-(--primary)"
                        : "bg-white border-transparent",
                    )}
                  >
                    <Avatar
                      name={c.nome}
                      size={36}
                      bg={avatarBgFor(c.id + String(i))}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm">{c.nome}</div>
                      <div className="text-xs text-(--text-secondary) truncate">
                        {[c.relazione, c.totale > 0 ? `${c.totale} uova totali` : null]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    </div>
                  </button>
                ))}
                <Button
                  type="button"
                  variant="text"
                  onClick={() => setShowAddContact(true)}
                  className="self-start"
                >
                  + Aggiungi nuovo contatto
                </Button>
              </div>
            )}
          </FormField>

          <FormField label="Note (opzionale)">
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Es. 'Per la torta di compleanno'"
            />
          </FormField>

          {error && (
            <p className="text-sm text-[#c0435a] text-center mb-3">{error}</p>
          )}

          <Button
            type="submit"
            fullWidth
            size="lg"
            disabled={pending || !contattoId}
          >
            {pending
              ? "Sto regalando..."
              : `Regala ${qty} uova${contattoSelezionato ? ` a ${contattoSelezionato.nome}` : "..."} 🎁`}
          </Button>

          <div className="mt-3 text-center">
            <Link
              href="/rubrica"
              className="text-[13px] text-(--text-secondary)"
            >
              Vai alla rubrica completa →
            </Link>
          </div>
        </form>
      </ScreenContainer>

      {showAddContact && (
        <AddContactInline
          onCreated={(c) => {
            setContatti2((arr) => [...arr, c]);
            setContattoId(c.id);
            setShowAddContact(false);
          }}
          onClose={() => setShowAddContact(false)}
        />
      )}
    </>
  );
}

function AddContactInline({
  onCreated,
  onClose,
}: {
  onCreated: (c: ContattoOption) => void;
  onClose: () => void;
}) {
  const { show } = useToast();
  const [nome, setNome] = useState("");
  const [relazione, setRelazione] = useState("");
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await createContatto({
        nome,
        relazione: relazione || null,
        telefono: null,
        note: null,
      });
      if (res.ok && res.id) {
        show("✓ Contatto aggiunto");
        onCreated({
          id: res.id,
          nome,
          relazione: relazione || null,
          totale: 0,
        });
      } else {
        show(res.error ?? "Ops, riprova!");
      }
    });
  }

  return (
    <Modal title="Nuovo contatto" onClose={onClose}>
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
            placeholder="Es. nonna, vicina"
          />
        </FormField>
        <Button type="submit" fullWidth size="lg" disabled={!nome.trim() || pending}>
          {pending ? "Salvataggio..." : "Aggiungi e continua"}
        </Button>
      </form>
    </Modal>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { useToast } from "@/components/ui/Toast";
import {
  abbandonaPollaio,
  cambiaRuoloMembro,
  rimuoviMembro,
} from "@/lib/actions/pollaio";
import { creaInviti, revocaInvito, type CreaInvitiResult } from "@/lib/actions/inviti";
import { linkContattoUtente } from "@/app/(app)/rubrica/actions";

export interface MembroRow {
  userId: string;
  ruolo: "admin" | "guest";
  displayName: string | null;
  email: string | null;
  isYou: boolean;
  contattoLinkatoNome: string | null;
}

export interface InvitoRow {
  id: string;
  email: string;
  ruolo: "admin" | "guest";
  scadenza: string;
}

export interface ContattoRow {
  id: string;
  nome: string;
  relazione: string | null;
  utenteId: string | null;
}

interface Props {
  pollaioId: string;
  ruoloCorrente: "admin" | "guest";
  membri: MembroRow[];
  inviti: InvitoRow[];
  contattiLinkabili: ContattoRow[];
}

export function MembriClient({
  pollaioId,
  ruoloCorrente,
  membri,
  inviti,
  contattiLinkabili,
}: Props) {
  const router = useRouter();
  const { show } = useToast();
  const [isPending, startTransition] = useTransition();
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [invitaOpen, setInvitaOpen] = useState(false);

  const isAdmin = ruoloCorrente === "admin";
  const [linkingMembro, setLinkingMembro] = useState<MembroRow | null>(null);

  const handleLeave = () => {
    setErrore(null);
    startTransition(async () => {
      const res = await abbandonaPollaio(pollaioId);
      if (!res.ok) {
        setErrore(res.error ?? "Errore");
        return;
      }
      setConfirmLeave(false);
      show("Hai lasciato il pollaio");
      router.push("/");
      router.refresh();
    });
  };

  const handlePromote = (userId: string, nuovoRuolo: "admin" | "guest") => {
    startTransition(async () => {
      const res = await cambiaRuoloMembro({ pollaioId, userId, nuovoRuolo });
      if (!res.ok) {
        show(res.error ?? "Errore");
        return;
      }
      show(nuovoRuolo === "admin" ? "Promosso ad admin" : "Ora è guest");
      router.refresh();
    });
  };

  const handleRemove = (userId: string, nome: string) => {
    if (!confirm(`Vuoi davvero rimuovere ${nome} dal pollaio?`)) return;
    startTransition(async () => {
      const res = await rimuoviMembro({ pollaioId, userId });
      if (!res.ok) {
        show(res.error ?? "Errore");
        return;
      }
      show("Membro rimosso");
      router.refresh();
    });
  };

  const handleRevoca = (invitoId: string, email: string) => {
    if (!confirm(`Revocare l'invito a ${email}?`)) return;
    startTransition(async () => {
      const res = await revocaInvito(invitoId);
      if (!res.ok) {
        show(res.error ?? "Errore");
        return;
      }
      show("Invito revocato");
      router.refresh();
    });
  };

  return (
    <>
      <SectionTitle>Chi fa parte</SectionTitle>
      <div className="flex flex-col gap-2">
        {membri.map((m) => {
          const nome = m.displayName ?? m.email?.split("@")[0] ?? "Membro";
          return (
            <Card key={m.userId} className="flex items-center gap-3 py-3 px-3.5">
              <div className="w-10 h-10 rounded-full bg-[var(--primary-light)] flex items-center justify-center text-lg flex-shrink-0">
                {m.ruolo === "admin" ? "👑" : "👤"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-[15px] truncate">
                  {nome}
                  {m.isYou && (
                    <span className="ml-2 text-xs text-[var(--text-secondary)] font-normal">
                      (tu)
                    </span>
                  )}
                </div>
                <div className="text-[12px] text-[var(--text-secondary)] truncate">
                  {m.ruolo === "admin" ? "Admin · gestisce tutto" : "Guest · solo visualizzazione"}
                </div>
                {m.contattoLinkatoNome && (
                  <div className="text-[11px] text-[var(--text-secondary)] truncate mt-0.5">
                    🔗 Collegato a {m.contattoLinkatoNome}
                  </div>
                )}
              </div>

              {isAdmin && !m.isYou && (
                <MembroMenu
                  ruolo={m.ruolo}
                  isPending={isPending}
                  hasLinkableContatti={contattiLinkabili.length > 0}
                  hasContattoLinkato={Boolean(m.contattoLinkatoNome)}
                  onPromote={() => handlePromote(m.userId, "admin")}
                  onDemote={() => handlePromote(m.userId, "guest")}
                  onRemove={() => handleRemove(m.userId, nome)}
                  onLinkContatto={() => setLinkingMembro(m)}
                />
              )}
            </Card>
          );
        })}
      </div>

      {isAdmin && (
        <>
          <div className="mt-4">
            <Button fullWidth onClick={() => setInvitaOpen(true)}>
              + Invita persone
            </Button>
          </div>

          {inviti.length > 0 && (
            <>
              <SectionTitle>Inviti in sospeso</SectionTitle>
              <div className="flex flex-col gap-2">
                {inviti.map((inv) => (
                  <Card key={inv.id} className="flex items-center gap-3 py-3 px-3.5">
                    <div className="w-10 h-10 rounded-full bg-[var(--primary-lighter)] border border-[var(--primary-light)] flex items-center justify-center text-lg flex-shrink-0">
                      ✉️
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-[14px] truncate">{inv.email}</div>
                      <div className="text-[12px] text-[var(--text-secondary)]">
                        {inv.ruolo === "admin" ? "Collaboratore" : "Visualizzatore"} · scade {formatScadenza(inv.scadenza)}
                      </div>
                    </div>
                    <Button
                      variant="text"
                      onClick={() => handleRevoca(inv.id, inv.email)}
                      disabled={isPending}
                      className="text-[#c0435a]"
                    >
                      Revoca
                    </Button>
                  </Card>
                ))}
              </div>
            </>
          )}
        </>
      )}

      <div className="mt-6">
        <SectionTitle>Esci dal pollaio</SectionTitle>
      </div>
      <Card>
        <p className="m-0 text-sm text-[var(--text-secondary)]">
          Se lasci questo pollaio non potrai più vedere i suoi dati. Potrai sempre essere
          re-invitata/o in futuro.
        </p>
        <Button
          variant="secondary"
          fullWidth
          className="mt-3 text-[#c0435a]"
          onClick={() => setConfirmLeave(true)}
        >
          Lascia questo pollaio
        </Button>
      </Card>

      {confirmLeave && (
        <Modal title="Sicura/o di voler lasciare?" onClose={() => setConfirmLeave(false)}>
          <p className="text-sm m-0">
            {"Verrai rimossa/o dal pollaio. Non perderai l'account, solo l'accesso a questo pollaio."}
          </p>
          {errore && <p className="text-[var(--primary)] text-sm mt-2">{errore}</p>}
          <div className="flex gap-2 mt-4">
            <Button
              variant="secondary"
              fullWidth
              onClick={() => setConfirmLeave(false)}
              disabled={isPending}
            >
              Annulla
            </Button>
            <Button
              fullWidth
              className="bg-[#c0435a]"
              onClick={handleLeave}
              disabled={isPending}
            >
              {isPending ? "Esco…" : "Sì, esco"}
            </Button>
          </div>
        </Modal>
      )}

      {invitaOpen && (
        <InvitaModal
          pollaioId={pollaioId}
          onClose={() => setInvitaOpen(false)}
          onSent={(res) => {
            const ok = res.inviati.length;
            const ko = res.falliti.length;
            if (ok > 0 && ko === 0) {
              show(ok === 1 ? "Invito inviato!" : `${ok} inviti inviati!`);
              setInvitaOpen(false);
              router.refresh();
            } else if (ok > 0) {
              show(`${ok} inviati, ${ko} falliti`);
              router.refresh();
            }
          }}
        />
      )}

      {linkingMembro && (
        <LinkContattoModal
          membro={linkingMembro}
          contatti={contattiLinkabili}
          onClose={() => setLinkingMembro(null)}
        />
      )}
    </>
  );
}

function formatScadenza(iso: string): string {
  const data = new Date(iso);
  const diff = data.getTime() - Date.now();
  const giorni = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (giorni <= 0) return "scaduto";
  if (giorni === 1) return "domani";
  return `tra ${giorni} giorni`;
}

function MembroMenu({
  ruolo,
  isPending,
  hasLinkableContatti,
  hasContattoLinkato,
  onPromote,
  onDemote,
  onRemove,
  onLinkContatto,
}: {
  ruolo: "admin" | "guest";
  isPending: boolean;
  hasLinkableContatti: boolean;
  hasContattoLinkato: boolean;
  onPromote: () => void;
  onDemote: () => void;
  onRemove: () => void;
  onLinkContatto: () => void;
}) {
  const [open, setOpen] = useState(false);
  const canLink = !hasContattoLinkato && hasLinkableContatti;

  return (
    <div className="relative">
      <Button
        variant="icon"
        onClick={() => setOpen((s) => !s)}
        aria-label="Opzioni membro"
      >
        <span className="text-xl">⋮</span>
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 bg-white rounded-[var(--radius-sm)] border border-[var(--border)] shadow-lg z-40 min-w-[200px] overflow-hidden">
            {canLink && (
              <button
                type="button"
                className="w-full px-4 py-3 text-left text-sm hover:bg-[var(--bg-warm)] disabled:opacity-50 border-b border-[var(--border)]"
                onClick={() => {
                  setOpen(false);
                  onLinkContatto();
                }}
                disabled={isPending}
              >
                🔗 Collega contatto
              </button>
            )}
            {ruolo === "guest" ? (
              <button
                type="button"
                className="w-full px-4 py-3 text-left text-sm hover:bg-[var(--bg-warm)] disabled:opacity-50"
                onClick={() => {
                  setOpen(false);
                  onPromote();
                }}
                disabled={isPending}
              >
                Promuovi ad admin
              </button>
            ) : (
              <button
                type="button"
                className="w-full px-4 py-3 text-left text-sm hover:bg-[var(--bg-warm)] disabled:opacity-50"
                onClick={() => {
                  setOpen(false);
                  onDemote();
                }}
                disabled={isPending}
              >
                Degrada a guest
              </button>
            )}
            <button
              type="button"
              className="w-full px-4 py-3 text-left text-sm text-[#c0435a] hover:bg-[var(--bg-warm)] disabled:opacity-50 border-t border-[var(--border)]"
              onClick={() => {
                setOpen(false);
                onRemove();
              }}
              disabled={isPending}
            >
              Rimuovi dal pollaio
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function InvitaModal({
  pollaioId,
  onClose,
  onSent,
}: {
  pollaioId: string;
  onClose: () => void;
  onSent: (res: CreaInvitiResult) => void;
}) {
  const [emails, setEmails] = useState("");
  const [ruolo, setRuolo] = useState<"admin" | "guest">("guest");
  const [messaggio, setMessaggio] = useState("");
  const [errore, setErrore] = useState<string | null>(null);
  const [falliti, setFalliti] = useState<{ email: string; motivo: string }[]>([]);
  const [isPending, startTransition] = useTransition();

  const handleSend = () => {
    setErrore(null);
    setFalliti([]);

    const lista = emails
      .split(/[,;\s\n]+/)
      .map((e) => e.trim())
      .filter(Boolean);

    if (lista.length === 0) {
      setErrore("Aggiungi almeno un indirizzo email.");
      return;
    }

    startTransition(async () => {
      const res = await creaInviti({
        pollaioId,
        emails: lista,
        ruolo,
        messaggio: messaggio.trim() || undefined,
      });

      if (!res.ok) {
        setErrore(res.error ?? "Qualcosa è andato storto.");
        return;
      }

      if (res.falliti.length > 0 && res.inviati.length === 0) {
        setFalliti(res.falliti);
        return;
      }

      setFalliti(res.falliti);
      onSent(res);
    });
  };

  return (
    <Modal title="Invita persone" onClose={onClose}>
      <div className="flex flex-col gap-3">
        <div>
          <label className="text-[13px] font-semibold block mb-1">
            Indirizzi email
          </label>
          <textarea
            value={emails}
            onChange={(e) => setEmails(e.target.value)}
            placeholder="mamma@email.it, papa@email.it&#10;...uno per riga o separati da virgola"
            rows={3}
            className="w-full px-4 py-3 rounded-[var(--radius-sm)] border-2 border-[var(--border)] text-[15px] bg-white resize-none"
          />
        </div>

        <div>
          <label className="text-[13px] font-semibold block mb-1">Come</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setRuolo("guest")}
              className={`flex-1 px-4 py-3 rounded-[var(--radius-sm)] border-2 text-sm text-left transition-colors ${
                ruolo === "guest"
                  ? "border-[var(--primary)] bg-[var(--primary-lighter)]"
                  : "border-[var(--border)] bg-white"
              }`}
            >
              <div className="font-semibold">👀 Visualizzatore</div>
              <div className="text-[12px] text-[var(--text-secondary)] mt-0.5">
                {"Solo lettura · può chiedere uova"}
              </div>
            </button>
            <button
              type="button"
              onClick={() => setRuolo("admin")}
              className={`flex-1 px-4 py-3 rounded-[var(--radius-sm)] border-2 text-sm text-left transition-colors ${
                ruolo === "admin"
                  ? "border-[var(--primary)] bg-[var(--primary-lighter)]"
                  : "border-[var(--border)] bg-white"
              }`}
            >
              <div className="font-semibold">👑 Collaboratore</div>
              <div className="text-[12px] text-[var(--text-secondary)] mt-0.5">
                Pieni poteri sul pollaio
              </div>
            </button>
          </div>
        </div>

        <div>
          <label className="text-[13px] font-semibold block mb-1">
            Messaggio (opzionale)
          </label>
          <textarea
            value={messaggio}
            onChange={(e) => setMessaggio(e.target.value)}
            placeholder="Es. Ciao mamma, ti ho aggiunta al pollaio così vedi quando ho le uova!"
            rows={2}
            maxLength={250}
            className="w-full px-4 py-3 rounded-[var(--radius-sm)] border-2 border-[var(--border)] text-[15px] bg-white resize-none"
          />
        </div>

        {errore && <p className="text-[var(--primary)] text-sm m-0">{errore}</p>}

        {falliti.length > 0 && (
          <div className="bg-[var(--primary-lighter)] border border-[var(--primary-light)] rounded-[var(--radius-sm)] p-3">
            <p className="font-semibold text-sm m-0 mb-1">Alcuni inviti non sono partiti:</p>
            <ul className="m-0 pl-4 text-xs text-[var(--text-secondary)]">
              {falliti.map((f) => (
                <li key={f.email}>
                  <b>{f.email}</b> — {f.motivo}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex gap-2 mt-2">
          <Button variant="secondary" fullWidth onClick={onClose} disabled={isPending}>
            Annulla
          </Button>
          <Button fullWidth onClick={handleSend} disabled={isPending}>
            {isPending ? "Invio…" : "Invia inviti"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function LinkContattoModal({
  membro,
  contatti,
  onClose,
}: {
  membro: MembroRow;
  contatti: ContattoRow[];
  onClose: () => void;
}) {
  const router = useRouter();
  const { show } = useToast();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rinomina, setRinomina] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const nomeMembro =
    membro.displayName ?? membro.email?.split("@")[0] ?? "questo membro";

  const handleSubmit = () => {
    setErrore(null);
    if (!selectedId) {
      setErrore("Seleziona un contatto.");
      return;
    }
    startTransition(async () => {
      const res = await linkContattoUtente({
        contattoId: selectedId,
        utenteId: membro.userId,
        rinomina: rinomina ? nomeMembro : undefined,
      });
      if (res.ok) {
        show("✓ Contatto collegato");
        onClose();
        router.refresh();
      } else {
        setErrore(res.error ?? "Ops, riprova!");
      }
    });
  };

  return (
    <Modal title={`Collega ${nomeMembro} a un contatto`} onClose={onClose}>
      <p className="text-sm text-[var(--text-secondary)] m-0 mb-3">
        Seleziona il contatto della rubrica che corrisponde a {nomeMembro}. Lo
        storico dei regali resta collegato.
      </p>

      <div className="flex flex-col gap-1.5 max-h-[40vh] overflow-y-auto">
        {contatti.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setSelectedId(c.id)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-sm)] border-2 text-left transition-colors ${
              selectedId === c.id
                ? "border-[var(--primary)] bg-[var(--primary-lighter)]"
                : "border-[var(--border)] bg-white hover:bg-[var(--bg-warm)]"
            }`}
          >
            <div className="w-8 h-8 rounded-full bg-[var(--primary-light)] flex items-center justify-center text-base flex-shrink-0">
              👤
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm truncate">{c.nome}</div>
              {c.relazione && (
                <div className="text-[12px] text-[var(--text-secondary)] truncate">
                  {c.relazione}
                </div>
              )}
            </div>
            {selectedId === c.id && (
              <span className="text-[var(--primary)] text-lg" aria-hidden>
                ●
              </span>
            )}
          </button>
        ))}
      </div>

      <label className="flex items-center gap-2 text-sm cursor-pointer mt-3">
        <input
          type="checkbox"
          checked={rinomina}
          onChange={(e) => setRinomina(e.target.checked)}
          className="w-4 h-4"
        />
        Rinomina il contatto in &ldquo;{nomeMembro}&rdquo;
      </label>

      {errore && <p className="text-[var(--primary)] text-sm m-0 mb-2">{errore}</p>}

      <div className="flex gap-2 mt-2">
        <Button variant="secondary" fullWidth onClick={onClose} disabled={isPending}>
          Annulla
        </Button>
        <Button
          fullWidth
          onClick={handleSubmit}
          disabled={isPending || !selectedId}
        >
          {isPending ? "Collego…" : "Collega"}
        </Button>
      </div>
    </Modal>
  );
}

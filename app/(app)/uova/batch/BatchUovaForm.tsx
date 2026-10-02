"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FormField } from "@/components/ui/FormField";
import { Header } from "@/components/ui/Header";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { useToast } from "@/components/ui/Toast";
import { avatarBgFor, defaultEmojiFor } from "@/lib/utils/avatar";
import {
  hideLoadingOverlay,
  showLoadingOverlay,
} from "@/components/layout/NavigationOverlay";
import { PrimoUovoModal } from "@/components/uova/PrimoUovoModal";
import {
  nomiGalline,
  sospensionePerUovo,
  type SospensioneUova,
} from "@/lib/utils/sospensioni";
import { createUovaBulk, type PrimoUovo } from "../actions";

export interface BatchGallina {
  id: string;
  nome: string;
  fotoUrl: string | null;
}

export interface BatchNido {
  id: string;
  nome: string;
}

const NON_SO_ID = "__non-so__";

interface Props {
  galline: BatchGallina[];
  nidi: BatchNido[];
  sospensioni: SospensioneUova[];
}

export function BatchUovaForm({ galline, nidi, sospensioni }: Props) {
  const router = useRouter();
  const { show } = useToast();
  const [pending, startTransition] = useTransition();

  // Lista di "righe" indipendenti: gallina+nido scelti, con counter.
  // Iniziamo con una riga per ogni gallina + una riga "Non so".
  type ContatoreKey = string; // animaleId|nidoId (oppure NON_SO_ID|nidoId)
  const [conteggi, setConteggi] = useState<Map<ContatoreKey, number>>(() => new Map());

  function keyOf(animaleId: string, nidoId: string | null): ContatoreKey {
    return `${animaleId}|${nidoId ?? ""}`;
  }
  function parseKey(k: ContatoreKey): { animaleId: string; nidoId: string | null } {
    const [animaleId, nidoId] = k.split("|");
    return { animaleId, nidoId: nidoId || null };
  }

  function incr(animaleId: string, nidoId: string | null) {
    const k = keyOf(animaleId, nidoId);
    setConteggi((prev) => {
      const next = new Map(prev);
      next.set(k, (next.get(k) ?? 0) + 1);
      return next;
    });
  }
  function decr(animaleId: string, nidoId: string | null) {
    const k = keyOf(animaleId, nidoId);
    setConteggi((prev) => {
      const next = new Map(prev);
      const cur = next.get(k) ?? 0;
      if (cur <= 1) next.delete(k);
      else next.set(k, cur - 1);
      return next;
    });
  }
  function totalePer(animaleId: string) {
    let t = 0;
    for (const [k, v] of conteggi.entries()) {
      const { animaleId: a } = parseKey(k);
      if (a === animaleId) t += v;
    }
    return t;
  }

  const totale = useMemo(() => {
    let t = 0;
    for (const v of conteggi.values()) t += v;
    return t;
  }, [conteggi]);

  // Stato globale
  const defaultDateTime = useMemo(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  }, []);
  const [data, setData] = useState(defaultDateTime);
  const [conservazione, setConservazione] = useState<"ambiente" | "frigo">("ambiente");
  const [note, setNote] = useState("");
  const [primeUova, setPrimeUova] = useState<PrimoUovo[] | null>(null);

  // Sospensioni che coprono il giorno scelto: le uova di quelle galline (e
  // quelle "Non so") verranno segnate come non commestibili dal DB.
  const giorno = data.slice(0, 10);
  const nomi = useMemo(() => new Map(galline.map((g) => [g.id, g.nome])), [galline]);
  const sospensioniDelGiorno = useMemo(
    () => sospensioni.filter((s) => giorno >= s.dataInizio && giorno <= s.dataFine),
    [sospensioni, giorno],
  );

  // Nido attivo: se l'utente vuole assegnare un nido a tutto, può scegliere
  // qui (oppure null = "Non so"). Per ora teniamo il nido come unico
  // per tutte le righe per semplicità — l'utente raramente sa di nido per
  // ogni gallina; può comunque modificare la singola uovo dopo.
  const [nidoSelezionato, setNidoSelezionato] = useState<string | null>(null);

  function reset() {
    setConteggi(new Map());
  }

  async function onSubmit() {
    if (totale === 0) {
      show("Aggiungi almeno un uovo");
      return;
    }
    showLoadingOverlay();
    startTransition(async () => {
      // Costruisci le righe a partire dal counter map (raggruppate per animale).
      // Tutte le righe condividono il nidoSelezionato attuale.
      const righe: { animaleId: string | null; nidoId: string | null; quantita: number }[] = [];
      const perAnimale = new Map<string, number>();
      for (const [k, v] of conteggi.entries()) {
        const { animaleId } = parseKey(k);
        perAnimale.set(animaleId, (perAnimale.get(animaleId) ?? 0) + v);
      }
      for (const [animaleKey, q] of perAnimale.entries()) {
        righe.push({
          animaleId: animaleKey === NON_SO_ID ? null : animaleKey,
          nidoId: nidoSelezionato,
          quantita: q,
        });
      }

      const res = await createUovaBulk({
        dataDeposizione: new Date(data).toISOString(),
        conservazione,
        noteGlobali: note || null,
        righe,
      });

      if (res.ok) {
        const nc = res.nonCommestibili ?? 0;
        if (res.primeUova && res.primeUova.length > 0) {
          if (nc > 0) show(`🚫 ${nc} uova registrate come non commestibili`);
          setPrimeUova(res.primeUova);
          hideLoadingOverlay();
          return;
        }
        show(
          nc > 0
            ? `✓ ${res.creati} uova registrate · 🚫 ${nc} non commestibili`
            : `✓ ${res.creati} uova registrate 🥚`,
        );
        router.push("/uova");
        router.refresh();
      } else {
        show(res.error ?? "Ops, riprova!");
        hideLoadingOverlay();
      }
    });
  }

  return (
    <ScreenContainer
      header={(
        <Header
          title="Raccolta veloce"
          subtitle={`${totale} ${totale === 1 ? "uovo" : "uova"} in totale`}
          onBack={() => router.back()}
        />
      )}
    >
        <div className="text-[13px] text-(--text-secondary) mb-3">
          Tocca <span className="font-bold">+</span> per ogni uovo trovato. In fondo,
          conferma per salvarle tutte insieme.{" "}
          <Link href="/uova/nuovo" className="text-(--primary) font-semibold">
            Aggiungi solo un uovo →
          </Link>
        </div>

        {galline.length === 0 ? (
          <Card>
            <p className="text-sm text-(--text-secondary) text-center py-3 m-0">
              Nessuna gallina nel pollaio.{" "}
              <Link href="/galline/nuova" className="text-(--primary) font-semibold">
                Aggiungine una
              </Link>
              .
            </p>
          </Card>
        ) : (
          <>
            {sospensioniDelGiorno.length > 0 && (
              <div
                className="mt-1 mb-1 rounded-(--radius) px-3 py-2.5 text-[13px] leading-relaxed"
                style={{ background: "#FFD6E055", border: "1px solid #c0435a33" }}
              >
                🚫 Sospensione in corso per{" "}
                <strong>
                  {sospensioniDelGiorno.map((s) => nomiGalline(s, nomi)).join(", ")}
                </strong>
                : le loro uova (e quelle &laquo;Non so&raquo;) verranno segnate come{" "}
                <strong>non commestibili</strong>.
              </div>
            )}
            <SectionTitle>Da chi le uova</SectionTitle>
            <div className="flex flex-col gap-2">
              {galline.map((g) => (
                <RigaGallina
                  key={g.id}
                  nome={g.nome}
                  fotoUrl={g.fotoUrl}
                  bg={avatarBgFor(g.id)}
                  count={totalePer(g.id)}
                  sospesa={!!sospensionePerUovo(sospensioniDelGiorno, g.id, giorno)}
                  onPlus={() => incr(g.id, nidoSelezionato)}
                  onMinus={() => decr(g.id, nidoSelezionato)}
                />
              ))}
              <RigaGallina
                nome="Non so"
                fotoUrl={null}
                bg="#F0EDE8"
                emoji="❓"
                count={totalePer(NON_SO_ID)}
                sospesa={sospensioniDelGiorno.length > 0}
                onPlus={() => incr(NON_SO_ID, nidoSelezionato)}
                onMinus={() => decr(NON_SO_ID, nidoSelezionato)}
              />
            </div>

            {totale > 0 && (
              <button
                type="button"
                onClick={reset}
                className="block mx-auto mt-3 text-xs text-(--text-secondary) underline"
              >
                Azzera conteggio
              </button>
            )}
          </>
        )}

        <SectionTitle>Dettagli (per tutte le uova)</SectionTitle>

        <FormField label="Data e ora">
          <Input
            type="datetime-local"
            value={data}
            onChange={(e) => setData(e.target.value)}
            required
          />
        </FormField>

        <FormField label="Conservazione">
          <SegmentedControl
            options={[
              { value: "ambiente", label: "🌤️ Ambiente" },
              { value: "frigo", label: "❄️ Frigo" },
            ]}
            value={conservazione}
            onChange={setConservazione}
          />
        </FormField>

        {nidi.length > 0 && (
          <FormField label="Nido (opzionale)">
            <Select
              value={nidoSelezionato ?? ""}
              onChange={(e) => setNidoSelezionato(e.target.value || null)}
            >
              <option value="">Non specificato</option>
              {nidi.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.nome}
                </option>
              ))}
            </Select>
          </FormField>
        )}

        <FormField label="Note (opzionale)">
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Es. raccolta del mattino"
          />
        </FormField>

        <Button
          type="button"
          fullWidth
          size="lg"
          onClick={onSubmit}
          disabled={pending || totale === 0}
          className="mt-3"
        >
          {pending
            ? "Sto salvando…"
            : totale === 0
              ? "Aggiungi almeno un uovo"
              : `Registra ${totale} ${totale === 1 ? "uovo" : "uova"} 🥚`}
        </Button>
        {primeUova && (
          <PrimoUovoModal
            prime={primeUova}
            onClose={() => {
              router.push("/uova");
              router.refresh();
            }}
          />
        )}
    </ScreenContainer>
  );
}

function RigaGallina({
  nome,
  fotoUrl,
  bg,
  emoji,
  count,
  sospesa,
  onPlus,
  onMinus,
}: {
  nome: string;
  fotoUrl: string | null;
  bg: string;
  emoji?: string;
  count: number;
  sospesa?: boolean;
  onPlus: () => void;
  onMinus: () => void;
}) {
  return (
    <Card className="flex items-center gap-3 py-2.5">
      <Avatar
        src={fotoUrl ?? undefined}
        emoji={!fotoUrl ? (emoji ?? defaultEmojiFor("gallina")) : undefined}
        bg={bg}
        name={nome}
        size={44}
      />
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-[15px] truncate">{nome}</div>
        {sospesa && (
          <div className="text-[11px] font-semibold text-[#c0435a]">
            🚫 uova non commestibili
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onMinus}
          disabled={count === 0}
          aria-label={`Togli un uovo da ${nome}`}
          className="w-9 h-9 rounded-full border border-(--border) bg-white font-bold text-lg disabled:opacity-30 active:scale-95 transition"
        >
          −
        </button>
        <div className="min-w-[28px] text-center font-extrabold text-lg text-(--primary)">
          {count}
        </div>
        <button
          type="button"
          onClick={onPlus}
          aria-label={`Aggiungi un uovo a ${nome}`}
          className="w-9 h-9 rounded-full bg-(--primary) text-white font-bold text-lg active:scale-95 transition shadow-[0_2px_6px_rgba(232,103,138,0.35)]"
        >
          +
        </button>
      </div>
    </Card>
  );
}

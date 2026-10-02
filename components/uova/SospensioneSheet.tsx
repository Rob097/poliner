"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Input, Textarea } from "@/components/ui/Input";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { useToast } from "@/components/ui/Toast";
import {
  hideLoadingOverlay,
  showLoadingOverlay,
} from "@/components/layout/NavigationOverlay";
import { avatarBgFor, defaultEmojiFor } from "@/lib/utils/avatar";
import { cn } from "@/lib/utils/cn";
import {
  DURATA_MAX_GIORNI,
  MOTIVI_SOSPENSIONE,
  commestibiliDal,
  dalGiorno,
  dataFineDaDurata,
  durataGiorni,
  formatPeriodo,
  isDataValida,
  oggiSospensioni,
  type SospensioneUova,
} from "@/lib/utils/sospensioni";
import {
  aggiornaSospensioneUova,
  creaSospensioneUova,
} from "@/lib/actions/sospensioni";

export interface GallinaOpzione {
  id: string;
  nome: string;
  fotoUrl: string | null;
}

interface Props {
  galline: GallinaOpzione[];
  /** Se presente, il form modifica questa sospensione. */
  iniziale?: SospensioneUova;
  /** Gallina già selezionata (apertura dalla sua scheda). */
  preselezionata?: string;
  onClose: () => void;
}

type Ambito = "alcune" | "tutte";
type ModalitaDurata = "giorni" | "fine";

export function SospensioneSheet({ galline, iniziale, preselezionata, onClose }: Props) {
  const router = useRouter();
  const { show } = useToast();
  const [pending, startTransition] = useTransition();

  const [ambito, setAmbito] = useState<Ambito>(iniziale?.tutte ? "tutte" : "alcune");
  const [selezionate, setSelezionate] = useState<Set<string>>(
    () => new Set(iniziale?.animaleIds ?? (preselezionata ? [preselezionata] : [])),
  );
  const [motivo, setMotivo] = useState(iniziale?.motivo ?? "");
  const [prodotto, setProdotto] = useState(iniziale?.prodotto ?? "");
  const [note, setNote] = useState(iniziale?.note ?? "");
  const [dataInizio, setDataInizio] = useState(iniziale?.dataInizio ?? oggiSospensioni());
  const [modalita, setModalita] = useState<ModalitaDurata>("giorni");
  const [giorni, setGiorni] = useState(
    iniziale ? String(durataGiorni(iniziale.dataInizio, iniziale.dataFine)) : "",
  );
  const [dataFine, setDataFine] = useState(iniziale?.dataFine ?? "");
  const [errore, setErrore] = useState<string | null>(null);
  // Se alcune uova del periodo erano già state consumate o regalate, il form
  // non si chiude da solo: l'avviso deve essere letto.
  const [giaUsate, setGiaUsate] = useState<number | null>(null);

  const fineCalcolata = useMemo(() => {
    if (!isDataValida(dataInizio)) return null;
    if (modalita === "giorni") {
      const n = Number(giorni);
      if (!Number.isInteger(n) || n < 1 || n > DURATA_MAX_GIORNI) return null;
      return dataFineDaDurata(dataInizio, n);
    }
    if (!isDataValida(dataFine) || dataFine < dataInizio) return null;
    if (durataGiorni(dataInizio, dataFine) > DURATA_MAX_GIORNI) return null;
    return dataFine;
  }, [dataInizio, modalita, giorni, dataFine]);

  const gallineOk = ambito === "tutte" || selezionate.size > 0;
  const valido = !!motivo.trim() && !!fineCalcolata && gallineOk;

  function toggleGallina(id: string) {
    setSelezionate((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function cambiaModalita(m: ModalitaDurata) {
    // Porta il valore da un campo all'altro, così non si riparte da zero.
    if (m === "fine" && fineCalcolata) setDataFine(fineCalcolata);
    if (m === "giorni" && fineCalcolata) {
      setGiorni(String(durataGiorni(dataInizio, fineCalcolata)));
    }
    setModalita(m);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valido || !fineCalcolata) return;
    setErrore(null);
    showLoadingOverlay();
    startTransition(async () => {
      const input = {
        dataInizio,
        dataFine: fineCalcolata,
        tutte: ambito === "tutte",
        animaleIds: ambito === "tutte" ? [] : Array.from(selezionate),
        motivo,
        prodotto: prodotto || null,
        note: note || null,
      };
      const res = iniziale
        ? await aggiornaSospensioneUova(iniziale.id, input)
        : await creaSospensioneUova(input);
      hideLoadingOverlay();
      if (!res.ok) {
        setErrore(res.error ?? "Ops, riprova!");
        return;
      }
      router.refresh();
      const marcate = res.uovaMarcate ?? 0;
      show(
        marcate > 0
          ? `✓ Salvata · ${marcate} ${marcate === 1 ? "uovo bloccato" : "uova bloccate"}`
          : "✓ Sospensione salvata",
      );
      if ((res.uovaGiaUsate ?? 0) > 0) {
        setGiaUsate(res.uovaGiaUsate ?? 0);
        return;
      }
      onClose();
    });
  }

  if (giaUsate !== null) {
    return (
      <Modal title="Attenzione" onClose={onClose}>
        <div className="text-center text-5xl mb-3" aria-hidden>
          ⚠️
        </div>
        <p className="text-sm text-text leading-relaxed text-center mb-2">
          {giaUsate === 1
            ? "Un uovo deposto in questo periodo risulta già consumato o regalato."
            : `${giaUsate} uova deposte in questo periodo risultano già consumate o regalate.`}
        </p>
        <p className="text-xs text-(--text-secondary) leading-relaxed text-center mb-5">
          Se le hai regalate, avvisa chi le ha ricevute che non sono da mangiare.
        </p>
        <Button size="lg" fullWidth onClick={onClose}>
          Ho capito
        </Button>
      </Modal>
    );
  }

  return (
    <Modal title={iniziale ? "Modifica sospensione" : "Sospensione uova"} onClose={onClose}>
      <form onSubmit={onSubmit}>
        <p className="text-[13px] text-(--text-secondary) leading-relaxed -mt-1 mb-4">
          Le uova deposte nel periodo dalle galline indicate verranno segnate come{" "}
          <strong className="text-[#c0435a]">non commestibili</strong>, anche quelle già
          raccolte.
        </p>

        <FormField label="Quali galline?">
          <SegmentedControl
            options={[
              { value: "alcune", label: "Solo alcune" },
              { value: "tutte", label: "Tutto il pollaio" },
            ]}
            value={ambito}
            onChange={setAmbito}
          />
          {ambito === "alcune" &&
            (galline.length === 0 ? (
              <p className="text-xs text-(--text-secondary) mt-2">
                Nessuna gallina attiva nel pollaio.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2 mt-2.5">
                {galline.map((g) => {
                  const on = selezionate.has(g.id);
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => toggleGallina(g.id)}
                      aria-pressed={on}
                      className={cn(
                        "relative rounded-(--radius) px-1.5 py-2.5 flex flex-col items-center gap-1 border-2 transition-all",
                        on
                          ? "bg-(--primary-lighter) border-(--primary)"
                          : "bg-white border-(--border)",
                      )}
                    >
                      <Avatar
                        src={g.fotoUrl ?? undefined}
                        emoji={g.fotoUrl ? undefined : defaultEmojiFor("gallina")}
                        bg={avatarBgFor(g.id)}
                        name={g.nome}
                        size={34}
                      />
                      <span className="text-[12px] font-semibold leading-tight text-center line-clamp-2">
                        {g.nome}
                      </span>
                      {on && (
                        <span
                          className="absolute top-1 right-1.5 text-[11px] font-bold text-(--primary)"
                          aria-hidden
                        >
                          ✓
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          {ambito === "tutte" && (
            <p className="text-xs text-(--text-secondary) mt-2 leading-relaxed">
              Tutte le uova del periodo, comprese quelle di galline aggiunte nel frattempo.
              Utile per farmaci nell&apos;acqua o nel mangime.
            </p>
          )}
        </FormField>

        <FormField label="Motivo">
          <Input
            list="sospensione-motivi"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Es. Antibiotico"
            maxLength={80}
            required
          />
          <datalist id="sospensione-motivi">
            {MOTIVI_SOSPENSIONE.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
        </FormField>

        <FormField label="Farmaco (opzionale)">
          <Input
            value={prodotto}
            onChange={(e) => setProdotto(e.target.value)}
            placeholder="Es. Baytril"
            maxLength={80}
          />
        </FormField>

        <FormField label="Dal giorno">
          <Input
            type="date"
            value={dataInizio}
            onChange={(e) => setDataInizio(e.target.value)}
            required
          />
        </FormField>

        {modalita === "giorni" ? (
          <FormField label="Per quanti giorni?">
            <Input
              type="number"
              inputMode="numeric"
              min={1}
              max={DURATA_MAX_GIORNI}
              value={giorni}
              onChange={(e) => setGiorni(e.target.value)}
              placeholder="Es. 7"
            />
            <button
              type="button"
              onClick={() => cambiaModalita("fine")}
              className="mt-1.5 text-xs text-(--primary) font-semibold"
            >
              Preferisci indicare l&apos;ultimo giorno? →
            </button>
          </FormField>
        ) : (
          <FormField label="Fino al giorno (incluso)">
            <Input
              type="date"
              value={dataFine}
              min={dataInizio}
              onChange={(e) => setDataFine(e.target.value)}
            />
            <button
              type="button"
              onClick={() => cambiaModalita("giorni")}
              className="mt-1.5 text-xs text-(--primary) font-semibold"
            >
              Preferisci indicare il numero di giorni? →
            </button>
          </FormField>
        )}

        {fineCalcolata && (
          <div
            className="mb-4 rounded-(--radius) px-3.5 py-3 text-[13px] leading-relaxed"
            style={{ background: "#FFD6E055", border: "1px solid #c0435a33" }}
          >
            <div>
              🚫 Non commestibili{" "}
              <strong>{formatPeriodo({ dataInizio, dataFine: fineCalcolata })}</strong> (
              {durataGiorni(dataInizio, fineCalcolata)}{" "}
              {durataGiorni(dataInizio, fineCalcolata) === 1 ? "giorno" : "giorni"})
            </div>
            <div className="mt-0.5">
              ✅ Di nuovo buone{" "}
              <strong>{dalGiorno(commestibiliDal({ dataFine: fineCalcolata }))}</strong>
            </div>
          </div>
        )}

        <p className="text-xs text-(--text-secondary) leading-relaxed mb-4 -mt-1">
          💡 Il tempo di sospensione è scritto nel foglietto del farmaco o te lo indica il
          veterinario, e si conta dall&apos;ultima somministrazione: se la cura dura più giorni,
          includili nel conteggio.
        </p>

        <FormField label="Note (opzionale)">
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Es. dose, indicazioni del veterinario"
          />
        </FormField>

        {errore && <p className="text-sm text-[#c0435a] text-center mb-3">{errore}</p>}

        <Button type="submit" size="lg" fullWidth disabled={!valido || pending}>
          {pending ? "Sto salvando…" : iniziale ? "Salva modifiche" : "Registra sospensione"}
        </Button>
      </form>
    </Modal>
  );
}

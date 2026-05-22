"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/ui/Header";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { ImageUploadField } from "@/components/ui/ImageUploadField";
import { RazzaSelect } from "@/components/galline/RazzaSelect";
import { useToast } from "@/components/ui/Toast";
import { trovaRazza, uovaAnnoLabel } from "@/lib/data/razze";
import { compressAndUpload } from "@/lib/utils/images";
import {
  hideLoadingOverlay,
  showLoadingOverlay,
} from "@/components/layout/NavigationOverlay";
import { archiviaAnimale, updateAnimale } from "../../actions";
import { todayIso } from "@/lib/utils/date";
import type { Tipo } from "@/lib/types";

interface InitialValues {
  id: string;
  nome: string;
  tipo: Tipo;
  razzaId: string | null;
  razzaCustom: string | null;
  dataNascita: string | null;
  colorePiumaggio: string | null;
  note: string | null;
  descrizionePubblica: string | null;
  fotoUrl: string | null;
}

interface Props {
  initial: InitialValues;
}

export function ModificaGallinaForm({ initial }: Props) {
  const router = useRouter();
  const { show } = useToast();

  const [nome, setNome] = useState(initial.nome);
  const [tipo, setTipo] = useState<Tipo>(initial.tipo);
  const [razzaId, setRazzaId] = useState<string | null>(initial.razzaId);
  const [razzaCustom, setRazzaCustom] = useState(initial.razzaCustom ?? "");
  const [dataNascita, setDataNascita] = useState(initial.dataNascita ?? "");
  const [colore, setColore] = useState(initial.colorePiumaggio ?? "");
  const [note, setNote] = useState(initial.note ?? "");
  const [descrizionePubblica, setDescrizionePubblica] = useState(
    initial.descrizionePubblica ?? "",
  );
  const [foto, setFoto] = useState<File | null>(null);
  const [fotoUrl, setFotoUrl] = useState<string | null>(initial.fotoUrl);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const razza = trovaRazza(razzaId);
  const showRazzaInfo = razza && razza.origine !== "mista";
  const isCustomRazza = razzaId === "mista";
  const showEggInfo = tipo === "gallina";

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    showLoadingOverlay();
    startTransition(async () => {
      try {
        let nextFotoUrl: string | null = fotoUrl;
        if (foto) {
          nextFotoUrl = await compressAndUpload(
            foto,
            `animali/${initial.id}/profilo.jpg`,
          );
        }
        const res = await updateAnimale({
          id: initial.id,
          nome,
          tipo,
          razzaId,
          razzaCustom: isCustomRazza ? razzaCustom : null,
          dataNascita: dataNascita || null,
          colorePiumaggio: colore,
          note,
          descrizionePubblica: descrizionePubblica.trim() || null,
          fotoUrl: nextFotoUrl,
        });
        if (!res.ok) {
          setError(res.error ?? "Ops, riprova!");
          hideLoadingOverlay();
          return;
        }
        show("✓ Modifiche salvate");
        router.push(`/galline/${initial.id}`);
        router.refresh();
      } catch (e) {
        console.error(e);
        setError("Ops, qualcosa non ha funzionato. Riprova!");
        hideLoadingOverlay();
      }
    });
  }

  function onArchive() {
    const confirmed = window.confirm(
      `Vuoi archiviare ${initial.nome}? Non apparirà più nelle liste, ma lo storico delle sue uova resterà.`,
    );
    if (!confirmed) return;
    showLoadingOverlay();
    startTransition(async () => {
      const res = await archiviaAnimale(initial.id);
      if (res.ok) {
        show("✓ Animale archiviato");
        router.push("/galline");
        router.refresh();
      } else {
        show("Ops, riprova!");
        hideLoadingOverlay();
      }
    });
  }

  return (
    <>
      <Header title="Modifica gallina" onBack={() => router.back()} />
      <ScreenContainer>
        <form onSubmit={onSubmit}>
          <div className="my-4">
            <ImageUploadField
              existingUrl={fotoUrl}
              onChange={(f) => {
                setFoto(f);
                if (!f) setFotoUrl(null);
              }}
              size={140}
              label="Aggiungi foto"
            />
          </div>

          <FormField label="Nome">
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
            />
          </FormField>

          <FormField label="Tipo">
            <SegmentedControl
              options={[
                { value: "gallina", label: "🐔 Gallina" },
                { value: "gallo", label: "🐓 Gallo" },
              ]}
              value={tipo}
              onChange={setTipo}
            />
          </FormField>

          <FormField label="Razza">
            <RazzaSelect value={razzaId} onChange={setRazzaId} />
          </FormField>

          {isCustomRazza && (
            <FormField label="Specifica razza (opzionale)">
              <Input
                value={razzaCustom}
                onChange={(e) => setRazzaCustom(e.target.value)}
              />
            </FormField>
          )}

          {showRazzaInfo && razza && (
            <div
              className="rounded-[var(--radius)] p-4 mb-4"
              style={{ background: "var(--primary-lighter)" }}
            >
              <div className="text-[13px] font-semibold text-[var(--primary)] mb-1.5">
                Info sulla razza
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-xs text-[var(--text-secondary)]">
                {showEggInfo && <span>🥚 {uovaAnnoLabel(razza)} uova/anno</span>}
                <span>📏 Taglia {razza.taglia}</span>
                {showEggInfo && <span>🎨 Uova {razza.coloreUova}</span>}
                <span>💛 {razza.temperamento}</span>
              </div>
            </div>
          )}

          <FormField label="Data di nascita (approssimativa)">
            <Input
              type="date"
              value={dataNascita}
              onChange={(e) => setDataNascita(e.target.value)}
              max={todayIso()}
            />
          </FormField>

          <FormField label="Colore piumaggio">
            <Input
              value={colore}
              onChange={(e) => setColore(e.target.value)}
            />
          </FormField>

          <FormField label="Note">
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
            />
          </FormField>

          <FormField label="Presentazione pubblica">
            <Textarea
              value={descrizionePubblica}
              onChange={(e) => setDescrizionePubblica(e.target.value)}
              rows={3}
              placeholder={`Es. "Una gran chiocciona, ama farsi grattare la testa…"`}
            />
            <p className="text-[11px] text-[var(--text-secondary)] mt-1 leading-snug">
              Appare nella pagina pubblica del pollaio quando un visitatore tocca la sua scheda. Lasciare vuoto per non mostrarla.
            </p>
          </FormField>

          {error && (
            <p className="text-sm text-[#c0435a] text-center mb-3">{error}</p>
          )}

          <div className="flex gap-2 mt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.back()}
              className="flex-1"
            >
              Annulla
            </Button>
            <Button
              type="submit"
              disabled={!nome.trim() || pending}
              className="flex-[2]"
            >
              {pending ? "Salvataggio..." : "Salva modifiche"}
            </Button>
          </div>

          <button
            type="button"
            onClick={onArchive}
            disabled={pending}
            className="block w-full mt-6 text-sm text-[#c0435a] font-semibold py-2"
          >
            Archivia animale
          </button>
        </form>
      </ScreenContainer>
    </>
  );
}

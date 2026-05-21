"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/ui/Header";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { ImageUploadField } from "@/components/ui/ImageUploadField";
import { RazzaSelect } from "@/components/galline/RazzaSelect";
import { trovaRazza, uovaAnnoLabel } from "@/lib/data/razze";
import { compressAndUpload } from "@/lib/utils/images";
import {
  hideLoadingOverlay,
  showLoadingOverlay,
} from "@/components/layout/NavigationOverlay";
import { createAnimale } from "../actions";
import { todayIso } from "@/lib/utils/date";
import type { Tipo } from "@/lib/types";

export function NuovaGallinaForm() {
  const router = useRouter();

  const [id] = useState(() => crypto.randomUUID());
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<Tipo>("gallina");
  const [razzaId, setRazzaId] = useState<string | null>(null);
  const [razzaCustom, setRazzaCustom] = useState("");
  const [dataNascita, setDataNascita] = useState("");
  const [colore, setColore] = useState("");
  const [note, setNote] = useState("");
  const [foto, setFoto] = useState<File | null>(null);

  const [giaDefunta, setGiaDefunta] = useState(false);
  const today = todayIso();
  const [defuntaIl, setDefuntaIl] = useState(today);
  const [causa, setCausa] = useState("");
  const [noteDecesso, setNoteDecesso] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const razza = trovaRazza(razzaId);
  const showRazzaInfo = razza && razza.origine !== "mista";
  const isCustomRazza = razzaId === "mista";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    showLoadingOverlay();
    try {
      let fotoUrl: string | null = null;
      if (foto) {
        fotoUrl = await compressAndUpload(foto, `animali/${id}/profilo.jpg`);
      }
      const result = await createAnimale({
        id,
        nome,
        tipo,
        razzaId,
        razzaCustom: isCustomRazza ? razzaCustom : null,
        dataNascita: dataNascita || null,
        colorePiumaggio: colore,
        note,
        fotoUrl,
        defuntaIl: giaDefunta ? defuntaIl : null,
        causaDecesso: giaDefunta ? causa || null : null,
        noteDecesso: giaDefunta ? noteDecesso || null : null,
      });
      if (!result.ok) {
        setError(result.error ?? "Ops, qualcosa non ha funzionato.");
        return;
      }
      if (giaDefunta) {
        router.push(`/galline/in-memoria`);
      } else {
        router.push(`/galline/${result.id}`);
      }
      router.refresh();
    } catch (e) {
      console.error(e);
      setError("Ops, qualcosa non ha funzionato. Riprova!");
    } finally {
      setSubmitting(false);
      hideLoadingOverlay();
    }
  }

  return (
    <>
      <Header title="Nuova gallina" onBack={() => router.back()} />
      <ScreenContainer>
        <form onSubmit={onSubmit}>
          <div className="my-4">
            <ImageUploadField onChange={setFoto} size={140} label="Aggiungi foto" />
          </div>

          <FormField label="Nome">
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder={`Es. "Luna"`}
              autoFocus
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
                placeholder='Es. "Razza locale"'
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
                <span>🥚 {uovaAnnoLabel(razza)} uova/anno</span>
                <span>📏 Taglia {razza.taglia}</span>
                <span>🎨 Uova {razza.coloreUova}</span>
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
              placeholder="Es. bianca, rossa, camosciata..."
            />
          </FormField>

          <FormField label="Note">
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Qualcosa da ricordare su questa gallina..."
            />
          </FormField>

          <details className="mb-4 mt-2 group">
            <summary
              className="list-none cursor-pointer flex items-center justify-between px-1 py-2 text-[12px] uppercase tracking-wider font-bold text-[var(--text-secondary)]"
            >
              <span>Impostazioni delicate</span>
              <span
                className="text-[var(--text-secondary)] transition-transform group-open:rotate-90"
                aria-hidden
              >
                ›
              </span>
            </summary>
            <div className="rounded-[var(--radius)] border border-[var(--border)] p-3 mt-1">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={giaDefunta}
                  onChange={(e) => setGiaDefunta(e.target.checked)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="text-sm font-semibold">
                    💔 Questa {tipo === "gallo" ? "gallo" : "gallina"} è già defunta
                  </div>
                  <div className="text-xs text-[var(--text-secondary)] mt-0.5">
                    La aggiungerò nella sezione “In memoria”, con il suo storico.
                  </div>
                </div>
              </label>

              {giaDefunta && (
                <div className="mt-3 space-y-3">
                  <FormField label="Data del decesso">
                    <Input
                      type="date"
                      value={defuntaIl}
                      onChange={(e) => setDefuntaIl(e.target.value)}
                      max={today}
                      required
                    />
                  </FormField>
                  <FormField label="Causa (opzionale)">
                    <Input
                      value={causa}
                      onChange={(e) => setCausa(e.target.value)}
                      placeholder="Es. vecchiaia, predatore…"
                    />
                  </FormField>
                  <FormField label="Note sul decesso (opzionale)">
                    <Textarea
                      value={noteDecesso}
                      onChange={(e) => setNoteDecesso(e.target.value)}
                      rows={2}
                    />
                  </FormField>
                </div>
              )}
            </div>
          </details>

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
              disabled={!nome.trim() || submitting}
              className="flex-[2]"
            >
              {submitting
                ? "Sto preparando..."
                : `Aggiungi ${tipo === "gallo" ? "gallo" : "gallina"}`}
            </Button>
          </div>
        </form>
      </ScreenContainer>
    </>
  );
}

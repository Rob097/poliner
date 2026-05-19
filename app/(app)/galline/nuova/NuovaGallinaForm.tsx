"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/ui/Header";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { ImageUploadField } from "@/components/ui/ImageUploadField";
import { RAZZE, trovaRazza, uovaAnnoLabel } from "@/lib/data/razze";
import { compressAndUpload } from "@/lib/utils/images";
import { createAnimale } from "../actions";

type Tipo = "gallina" | "gallo";

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

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const razza = trovaRazza(razzaId);
  const showRazzaInfo = razza && razza.origine !== "mista";
  const isCustomRazza = razzaId === "mista";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
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
      });
      if (!result.ok) {
        setError(result.error ?? "Ops, qualcosa non ha funzionato.");
        return;
      }
      router.push(`/galline/${result.id}`);
      router.refresh();
    } catch (e) {
      console.error(e);
      setError("Ops, qualcosa non ha funzionato. Riprova!");
    } finally {
      setSubmitting(false);
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
            <Select
              value={razzaId ?? ""}
              onChange={(e) => setRazzaId(e.target.value || null)}
            >
              <option value="">Scegli una razza...</option>
              {RAZZE.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nome}
                </option>
              ))}
            </Select>
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
              max={new Date().toISOString().slice(0, 10)}
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

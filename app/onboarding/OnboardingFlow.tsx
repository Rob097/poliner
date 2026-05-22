"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PolinerLogo } from "@/components/brand/PolinerLogo";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { IconBack, IconCamera, IconMap, IconClose } from "@/components/ui/icons";
import { RAZZE, trovaRazza, uovaAnnoLabel } from "@/lib/data/razze";
import { useGeolocation } from "@/lib/hooks/useGeolocation";
import { reverseGeocode } from "@/lib/utils/geocoding";
import { compressAndUpload } from "@/lib/utils/images";
import { completeOnboarding } from "./actions";

const TOTAL_STEPS = 5;

type Tipo = "gallina" | "gallo";

export default function OnboardingFlow() {
  const router = useRouter();

  // Identificativo stabile per il pollaio (usato anche nel path della foto).
  const [pollaioId] = useState(() => crypto.randomUUID());
  const [step, setStep] = useState(0);
  const [animKey, setAnimKey] = useState(0);

  // Dati raccolti durante il flusso
  const [pollaioName, setPollaioName] = useState("");
  const [locationName, setLocationName] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [chickenName, setChickenName] = useState("");
  const [chickenTipo, setChickenTipo] = useState<Tipo>("gallina");
  const [chickenRazzaId, setChickenRazzaId] = useState<string | null>(null);

  // Stato submit + errori
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const goNext = () => {
    setStep((s) => Math.min(TOTAL_STEPS, s + 1));
    setAnimKey((k) => k + 1);
  };
  const goBack = () => {
    setStep((s) => Math.max(0, s - 1));
    setAnimKey((k) => k + 1);
  };

  // Preview foto via FileReader
  useEffect(() => {
    if (!fotoFile) {
      setFotoPreview(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setFotoPreview(reader.result as string);
    reader.readAsDataURL(fotoFile);
  }, [fotoFile]);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      let fotoUrl: string | null = null;
      if (fotoFile) {
        const ext = "jpg";
        fotoUrl = await compressAndUpload(fotoFile, `pollai/${pollaioId}/cover.${ext}`);
      }
      const result = await completeOnboarding({
        pollaioId,
        pollaioNome: pollaioName,
        posizione: {
          nome: locationName,
          lat: coords?.lat ?? null,
          lng: coords?.lng ?? null,
        },
        fotoUrl,
        animale: {
          nome: chickenName,
          tipo: chickenTipo,
          razzaId: chickenRazzaId,
        },
      });
      if (!result.ok) {
        setError(result.error ?? "Ops, qualcosa non ha funzionato. Riprova!");
        return;
      }
      setStep(5);
      setAnimKey((k) => k + 1);
    } catch (e) {
      console.error(e);
      setError("Ops, qualcosa non ha funzionato. Riprova!");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col bg-bg px-6 h-full">
      {step > 0 && step < TOTAL_STEPS && (
        <div className="pt-3">
          <Button variant="icon" onClick={goBack} aria-label="Indietro">
            <IconBack size={22} />
          </Button>
        </div>
      )}

      <div key={animKey} className="flex-1 flex flex-col animate-fade-in">
        {step === 0 && <StepWelcome onNext={goNext} />}
        {step === 1 && (
          <StepNome
            value={pollaioName}
            onChange={setPollaioName}
            onNext={goNext}
          />
        )}
        {step === 2 && (
          <StepPosizione
            locationName={locationName}
            onLocationName={setLocationName}
            coords={coords}
            onCoords={setCoords}
            onNext={goNext}
          />
        )}
        {step === 3 && (
          <StepFoto
            preview={fotoPreview}
            onFile={setFotoFile}
            onClearFile={() => setFotoFile(null)}
            onNext={goNext}
          />
        )}
        {step === 4 && (
          <StepGallina
            nome={chickenName}
            onNome={setChickenName}
            tipo={chickenTipo}
            onTipo={setChickenTipo}
            razzaId={chickenRazzaId}
            onRazzaId={setChickenRazzaId}
            onSubmit={handleSubmit}
            submitting={submitting}
            error={error}
          />
        )}
        {step === 5 && (
          <StepSuccess
            pollaioName={pollaioName}
            chickenName={chickenName}
            chickenTipo={chickenTipo}
            chickenRazzaId={chickenRazzaId}
            locationName={locationName}
            onContinue={() => {
              router.push("/");
              router.refresh();
            }}
          />
        )}
      </div>

      {step < TOTAL_STEPS && <Dots step={step} />}
    </div>
  );
}

// ── Stepper dots ─────────────────────────────────────────
function Dots({ step }: { step: number }) {
  return (
    <div className="flex justify-center gap-2 mb-5">
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <div
          key={i}
          className="h-2 rounded-full transition-all duration-300"
          style={{
            width: i === step ? 24 : 8,
            background: i === step ? "var(--primary)" : "var(--border)",
          }}
        />
      ))}
    </div>
  );
}

// ── Step 0: Welcome ──────────────────────────────────────
function StepWelcome({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center text-center py-6 gap-4">
        <div className="text-7xl">🐔</div>
        <PolinerLogo size="lg" />
        <p className="text-[15px] text-(--text-secondary) leading-relaxed max-w-xs">
          La memoria digitale del tuo pollaio.
          <br />
          Tutto in un posto solo, sempre a portata di mano.
        </p>
      </div>
      <div className="flex flex-col gap-2 pb-6">
        <Button size="lg" fullWidth onClick={onNext}>
          Iniziamo!
        </Button>
        <p className="text-center text-[13px] text-(--text-secondary)">
          Ci vorranno solo 2 minuti ✨
        </p>
      </div>
    </div>
  );
}

// ── Step 1: Nome pollaio ─────────────────────────────────
function StepNome({
  value,
  onChange,
  onNext,
}: {
  value: string;
  onChange: (s: string) => void;
  onNext: () => void;
}) {
  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center text-center py-6 gap-4">
        <div className="text-7xl">🏡</div>
        <h2 className="font-serif text-[26px] font-bold leading-snug text-text">
          Come si chiama il tuo pollaio?
        </h2>
        <p className="text-[15px] text-(--text-secondary) max-w-xs">
          Dagli un nome carino — sarà la tua casetta digitale
        </p>
        <Input
          autoFocus
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Es. "Il Pollaio di Fiocca"`}
          className="text-center text-base"
        />
      </div>
      <div className="pb-4">
        <Button size="lg" fullWidth onClick={onNext} disabled={!value.trim()}>
          Avanti
        </Button>
      </div>
    </div>
  );
}

// ── Step 2: Posizione ────────────────────────────────────
function StepPosizione({
  locationName,
  onLocationName,
  coords,
  onCoords,
  onNext,
}: {
  locationName: string;
  onLocationName: (s: string) => void;
  coords: { lat: number; lng: number } | null;
  onCoords: (c: { lat: number; lng: number } | null) => void;
  onNext: () => void;
}) {
  const geo = useGeolocation();
  const [geocoding, setGeocoding] = useState(false);

  useEffect(() => {
    if (!geo.coords) return;
    onCoords({ lat: geo.coords.lat, lng: geo.coords.lng });
    setGeocoding(true);
    reverseGeocode(geo.coords.lat, geo.coords.lng)
      .then((place) => {
        if (place?.display) onLocationName(place.display);
      })
      .finally(() => setGeocoding(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo.coords]);

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center text-center py-6 gap-4">
        <div className="text-7xl">📍</div>
        <h2 className="font-serif text-[26px] font-bold leading-snug text-text">
          Dove si trova?
        </h2>
        <p className="text-[15px] text-(--text-secondary) max-w-xs">
          Ci serve per mostrarti il meteo e l&apos;orario del tramonto
        </p>
        <div className="w-full max-w-sm flex flex-col gap-3">
          <Input
            value={locationName}
            onChange={(e) => {
              onLocationName(e.target.value);
              // Se l'utente modifica a mano, scartiamo i coords precedenti
              if (coords) onCoords(null);
            }}
            placeholder="Es. Firenze, Toscana"
            className="text-center"
          />
          <Button
            variant="secondary"
            onClick={geo.request}
            disabled={geo.loading || geocoding}
            className="self-center"
          >
            <IconMap size={16} />
            {geo.loading
              ? "Sto cercando..."
              : geocoding
                ? "Trovo la città..."
                : coords
                  ? "✓ Posizione rilevata"
                  : "Usa la mia posizione"}
          </Button>
          {geo.error && (
            <p className="text-[13px] text-[#c0435a] text-center">{geo.error}</p>
          )}
        </div>
      </div>
      <div className="pb-4">
        <Button size="lg" fullWidth onClick={onNext} disabled={!locationName.trim()}>
          Avanti
        </Button>
      </div>
    </div>
  );
}

// ── Step 3: Foto pollaio ─────────────────────────────────
function StepFoto({
  preview,
  onFile,
  onClearFile,
  onNext,
}: {
  preview: string | null;
  onFile: (f: File) => void;
  onClearFile: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center text-center py-6 gap-5">
        <label
          className="w-40 h-40 rounded-3xl bg-(--primary-lighter) flex items-center justify-center cursor-pointer overflow-hidden relative"
          style={{ border: preview ? "none" : "3px dashed var(--primary-light)" }}
        >
          {preview ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Anteprima pollaio" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  onClearFile();
                }}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-text/80 text-white flex items-center justify-center"
                aria-label="Rimuovi foto"
              >
                <IconClose size={16} color="#fff" />
              </button>
            </>
          ) : (
            <div className="text-center flex flex-col items-center">
              <IconCamera size={40} color="var(--primary)" />
              <div className="text-[13px] text-(--primary) mt-2 font-semibold">
                Aggiungi foto
              </div>
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
            }}
          />
        </label>
        <h2 className="font-serif text-[26px] font-bold leading-snug text-text">
          Una foto del pollaio?
        </h2>
        <p className="text-[15px] text-(--text-secondary) max-w-xs">
          Opzionale — puoi aggiungerla anche dopo
        </p>
      </div>
      <div className="pb-4 flex flex-col gap-2">
        <Button size="lg" fullWidth onClick={onNext}>
          Avanti
        </Button>
        {!preview && (
          <Button variant="text" onClick={onNext}>
            Salto per ora
          </Button>
        )}
      </div>
    </div>
  );
}

// ── Step 4: Prima gallina ────────────────────────────────
function StepGallina({
  nome,
  onNome,
  tipo,
  onTipo,
  razzaId,
  onRazzaId,
  onSubmit,
  submitting,
  error,
}: {
  nome: string;
  onNome: (s: string) => void;
  tipo: Tipo;
  onTipo: (t: Tipo) => void;
  razzaId: string | null;
  onRazzaId: (id: string | null) => void;
  onSubmit: () => void;
  submitting: boolean;
  error: string | null;
}) {
  const razza = trovaRazza(razzaId);
  const showRazzaInfo = razza && razza.origine !== "mista";
  const showEggInfo = tipo === "gallina";

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 overflow-y-auto py-4">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">{tipo === "gallo" ? "🐓" : "🐣"}</div>
          <h2 className="font-serif text-[22px] font-bold leading-snug text-text">
            Aggiungi la tua prima gallina!
          </h2>
          <p className="text-sm text-(--text-secondary) mt-1">
            Potrai aggiungerne altre dopo
          </p>
        </div>

        <FormField label="Nome">
          <Input
            value={nome}
            onChange={(e) => onNome(e.target.value)}
            placeholder={`Es. "Bianca"`}
            autoFocus
          />
        </FormField>

        <FormField label="Tipo">
          <SegmentedControl
            options={[
              { value: "gallina", label: "🐔 Gallina" },
              { value: "gallo", label: "🐓 Gallo" },
            ]}
            value={tipo}
            onChange={onTipo}
          />
        </FormField>

        <FormField label="Razza">
          <Select
            value={razzaId ?? ""}
            onChange={(e) => onRazzaId(e.target.value || null)}
          >
            <option value="">Scegli una razza...</option>
            {RAZZE.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nome}
              </option>
            ))}
          </Select>
        </FormField>

        {showRazzaInfo && razza && (
          <div
            className="rounded-(--radius) p-4 border-none mt-2"
            style={{ background: "var(--primary-lighter)" }}
          >
            <div className="text-[13px] font-semibold text-(--primary) mb-1.5">
              Info sulla razza {razza.nome.split(" (")[0]}
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-xs text-(--text-secondary)">
              {showEggInfo && <span>🥚 {uovaAnnoLabel(razza)} uova/anno</span>}
              <span>📏 Taglia {razza.taglia}</span>
              {showEggInfo && <span>🎨 Uova {razza.coloreUova}</span>}
              <span>💛 {razza.temperamento}</span>
            </div>
          </div>
        )}

        {error && (
          <p className="text-sm text-[#c0435a] text-center mt-3">{error}</p>
        )}
      </div>

      <div className="pb-4">
        <Button
          size="lg"
          fullWidth
          onClick={onSubmit}
          disabled={!nome.trim() || submitting}
        >
          {submitting ? "Sto preparando..." : "Tutto pronto!"}
        </Button>
      </div>
    </div>
  );
}

// ── Step 5: Success ──────────────────────────────────────
function StepSuccess({
  pollaioName,
  chickenName,
  chickenTipo,
  chickenRazzaId,
  locationName,
  onContinue,
}: {
  pollaioName: string;
  chickenName: string;
  chickenTipo: Tipo;
  chickenRazzaId: string | null;
  locationName: string;
  onContinue: () => void;
}) {
  const razza = trovaRazza(chickenRazzaId);
  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center text-center py-6 gap-3">
        <div className="text-7xl animate-bounce">🎉</div>
        <h2 className="font-serif text-[28px] font-bold leading-snug text-text">
          Perfetto!
        </h2>
        <h3 className="font-serif text-xl font-semibold text-(--primary)">
          {pollaioName || "Il tuo pollaio"} è pronto
        </h3>
        <p className="text-[15px] text-(--text-secondary) max-w-xs">
          {chickenName || "La tua gallina"} ti aspetta! Ora puoi iniziare a
          registrare uova, pulizie e molto altro.
        </p>
        <div
          className="w-full mt-3 p-4 rounded-(--radius) border border-(--border) bg-white text-left"
        >
          <div className="text-[13px] font-semibold text-(--text-secondary) mb-2.5">
            Il tuo pollaio
          </div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">🏡</span>
            <div>
              <div className="font-bold text-[15px]">{pollaioName || "Il mio pollaio"}</div>
              <div className="text-xs text-(--text-secondary)">
                {locationName || "Posizione non impostata"}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{chickenTipo === "gallo" ? "🐓" : "🐔"}</span>
            <div>
              <div className="font-bold text-[15px]">{chickenName || "Gallina"}</div>
              <div className="text-xs text-(--text-secondary)">
                {razza?.nome ?? "Razza non specificata"}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="pb-6">
        <Button size="lg" fullWidth onClick={onContinue}>
          Entra nel pollaio 🐔
        </Button>
      </div>
    </div>
  );
}

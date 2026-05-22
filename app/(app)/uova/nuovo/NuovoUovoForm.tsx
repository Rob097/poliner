"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/ui/Header";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { ImageUploadField } from "@/components/ui/ImageUploadField";
import { useToast } from "@/components/ui/Toast";
import { defaultEmojiFor } from "@/lib/utils/avatar";
import { compressAndUpload } from "@/lib/utils/images";
import { cn } from "@/lib/utils/cn";
import {
  hideLoadingOverlay,
  showLoadingOverlay,
} from "@/components/layout/NavigationOverlay";
import { createUovo } from "../actions";

export interface Gallina {
  id: string;
  nome: string;
  fotoUrl: string | null;
}

export interface Nido {
  id: string;
  nome: string;
}

interface Props {
  galline: Gallina[];
  nidi: Nido[];
}

const NON_SO = "__non-so__";

export function NuovoUovoForm({ galline, nidi }: Props) {
  const router = useRouter();
  const { show } = useToast();

  const [id] = useState(() => crypto.randomUUID());
  const [gallinaId, setGallinaId] = useState<string | null>(null);
  const [nidoId, setNidoId] = useState<string | null>(null);
  const [conservazione, setConservazione] = useState<"ambiente" | "frigo">("ambiente");
  const defaultDateTime = useMemo(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  }, []);
  const [data, setData] = useState(defaultDateTime);
  const [note, setNote] = useState("");
  const [foto, setFoto] = useState<File | null>(null);
  const [showFoto, setShowFoto] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    showLoadingOverlay();
    try {
      let fotoUrl: string | null = null;
      if (foto) {
        fotoUrl = await compressAndUpload(foto, `uova/${id}/foto.jpg`);
      }
      const res = await createUovo({
        id,
        animaleId: gallinaId === NON_SO ? null : gallinaId,
        nidoId,
        dataDeposizione: new Date(data).toISOString(),
        conservazione,
        note,
        fotoUrl,
      });
      if (!res.ok) {
        setError(res.error ?? "Ops, riprova!");
        return;
      }
      show("✓ Ottimo! Uovo registrato 🥚");
      router.push("/uova");
      router.refresh();
    } catch (e) {
      console.error(e);
      setError("Ops, qualcosa non ha funzionato. Riprova!");
    } finally {
      setPending(false);
      hideLoadingOverlay();
    }
  }

  return (
    <ScreenContainer header={<Header title="Aggiungi uovo" onBack={() => router.back()} />}>
        <Link
          href="/uova/batch"
          className="flex items-center justify-between gap-2 mb-3 px-3 py-2.5 rounded-(--radius) border border-(--border) bg-white"
        >
          <div className="flex items-center gap-2.5">
            <span className="text-xl" aria-hidden>🧺</span>
            <div>
              <div className="font-semibold text-sm">Raccolta veloce</div>
              <div className="text-xs text-(--text-secondary)">
                Aggiungi più uova insieme con un counter per gallina
              </div>
            </div>
          </div>
          <span className="text-(--text-secondary)" aria-hidden>›</span>
        </Link>

        <form onSubmit={onSubmit}>
          <div className="text-center my-3">
            <div className="text-6xl">🥚</div>
            <div className="text-sm text-(--text-secondary) mt-1">
              Chi ha fatto l&apos;uovo?
            </div>
          </div>

          <FormField label="Gallina">
            {galline.length === 0 ? (
              <Card>
                <p className="text-sm text-(--text-secondary) text-center py-2">
                  Nessuna gallina nel pollaio.{" "}
                  <Link
                    href="/galline/nuova"
                    className="text-(--primary) font-semibold"
                  >
                    Aggiungine una
                  </Link>
                  .
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {galline.map((g) => (
                  <SelectableChip
                    key={g.id}
                    selected={gallinaId === g.id}
                    onClick={() => setGallinaId(g.id)}
                  >
                    {g.fotoUrl ? (
                      <Avatar src={g.fotoUrl} name={g.nome} size={32} />
                    ) : (
                      <div className="text-2xl">{defaultEmojiFor("gallina")}</div>
                    )}
                    <div className="text-[13px] font-semibold mt-1">{g.nome}</div>
                  </SelectableChip>
                ))}
                <SelectableChip
                  selected={gallinaId === NON_SO}
                  onClick={() => setGallinaId(NON_SO)}
                >
                  <div className="text-2xl">❓</div>
                  <div className="text-[13px] font-semibold mt-1">Non so</div>
                </SelectableChip>
              </div>
            )}
          </FormField>

          <FormField label="In quale nido?">
            {nidi.length === 0 ? (
              <Card>
                <p className="text-sm text-(--text-secondary) text-center py-2">
                  Nessun nido configurato.{" "}
                  <Link
                    href="/uova/nidi"
                    className="text-(--primary) font-semibold"
                  >
                    Aggiungine uno
                  </Link>
                  .
                </p>
              </Card>
            ) : (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {nidi.map((n) => (
                  <SelectableChip
                    key={n.id}
                    selected={nidoId === n.id}
                    onClick={() => setNidoId(n.id)}
                    className="shrink-0 min-w-[80px]"
                  >
                    <div className="text-lg">🪺</div>
                    <div className="text-[11px] font-semibold mt-0.5 text-center px-1">
                      {n.nome.replace(/^Nido\s+/i, "")}
                    </div>
                  </SelectableChip>
                ))}
                <SelectableChip
                  selected={nidoId === null}
                  onClick={() => setNidoId(null)}
                  className="shrink-0 min-w-[80px]"
                >
                  <div className="text-lg">❓</div>
                  <div className="text-[11px] font-semibold mt-0.5">Non so</div>
                </SelectableChip>
              </div>
            )}
          </FormField>

          <FormField label="Data e ora">
            <Input
              type="datetime-local"
              value={data}
              onChange={(e) => setData(e.target.value)}
              required
            />
          </FormField>

          <FormField label="Dove conservi le uova?">
            <SegmentedControl
              options={[
                { value: "ambiente", label: "🌤️ Ambiente" },
                { value: "frigo", label: "❄️ Frigo" },
              ]}
              value={conservazione}
              onChange={setConservazione}
            />
          </FormField>

          <FormField label="Note (opzionale)">
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={`Es. "guscio fragile", "uovo piccolo"`}
            />
          </FormField>

          {!showFoto && !foto ? (
            <Button
              type="button"
              variant="secondary"
              fullWidth
              className="mb-3"
              onClick={() => setShowFoto(true)}
            >
              📷 Aggiungi foto (opzionale)
            </Button>
          ) : (
            <div className="mb-4">
              <ImageUploadField onChange={setFoto} size={120} label="Foto uovo" />
            </div>
          )}

          {error && (
            <p className="text-sm text-[#c0435a] text-center mb-3">{error}</p>
          )}

          <Button
            type="submit"
            fullWidth
            size="lg"
            disabled={pending || (galline.length > 0 && !gallinaId)}
          >
            {pending ? "Sto salvando..." : "Registra uovo 🥚"}
          </Button>
        </form>
    </ScreenContainer>
  );
}

function SelectableChip({
  selected,
  onClick,
  children,
  className,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "card text-center cursor-pointer transition-all rounded-(--radius) px-2 py-3",
        selected
          ? "bg-(--primary-lighter) border-2 border-(--primary)"
          : "bg-white border-2 border-transparent",
        "flex flex-col items-center justify-center",
        className,
      )}
    >
      {children}
    </button>
  );
}

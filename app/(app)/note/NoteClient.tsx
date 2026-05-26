"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { FormField } from "@/components/ui/FormField";
import { ImageUploadField } from "@/components/ui/ImageUploadField";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { IconPlus } from "@/components/ui/icons";
import { formatData, formatDataLunga } from "@/lib/utils/date";
import { compressAndUpload } from "@/lib/utils/images";
import {
  archiviaNota,
  createNota,
  deleteNota,
  updateNota,
  type CanaleNotifica,
  type TagNota,
} from "./actions";
import { usePagination } from "@/lib/hooks/usePagination";
import { LoadMoreButton } from "@/components/ui/LoadMoreButton";

export interface NotaItem {
  id: string;
  testo: string;
  data: string;
  tag: TagNota | null;
  fotoUrl: string | null;
  promemoriaData: string | null;
  promemoriaCanale: CanaleNotifica | null;
  promemoriaInviato: boolean;
  archiviata: boolean;
}

const TAGS: { value: TagNota; label: string; icon: string; bg: string; color: string }[] = [
  { value: "osservazione", label: "Osservazione", icon: "👁️", bg: "#A8D1FF44", color: "#3a5a7a" },
  { value: "idea", label: "Idea", icon: "💡", bg: "#FFE07A44", color: "#8a7020" },
  { value: "promemoria", label: "Promemoria", icon: "🔔", bg: "#E8DAFF44", color: "#7b5ea7" },
];

type Filtro = "tutte" | TagNota | "archiviate";

interface Props {
  items: NotaItem[];
  apriNuova: boolean;
}

export function NoteClient({ items, apriNuova }: Props) {
  const [creating, setCreating] = useState(apriNuova);
  const [editing, setEditing] = useState<NotaItem | null>(null);
  const [filtro, setFiltro] = useState<Filtro>("tutte");

  // Se siamo arrivati con ?nuova=1 e poi cambia, evita riapertura
  useEffect(() => {
    if (apriNuova) setCreating(true);
  }, [apriNuova]);

  const nonArchiviati = useMemo(
    () => items.filter((n) => !n.archiviata),
    [items],
  );
  const archiviati = useMemo(
    () => items.filter((n) => n.archiviata),
    [items],
  );

  const filtered = useMemo(() => {
    if (filtro === "archiviate") return archiviati;
    if (filtro === "tutte") return nonArchiviati;
    return nonArchiviati.filter((n) => n.tag === filtro);
  }, [filtro, nonArchiviati, archiviati]);

  useEffect(() => {
    if (filtro === "archiviate" && archiviati.length === 0) {
      setFiltro("tutte");
    }
  }, [filtro, archiviati.length]);

  const { visible, hasMore, remaining, loadMore } = usePagination(filtered);

  return (
    <>
      <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-4 px-4">
        <FiltroChip active={filtro === "tutte"} onClick={() => setFiltro("tutte")}>
          Tutte ({nonArchiviati.length})
        </FiltroChip>
        {archiviati.length > 0 && (
          <FiltroChip
            active={filtro === "archiviate"}
            onClick={() => setFiltro("archiviate")}
          >
            🗄️ Archiviate ({archiviati.length})
          </FiltroChip>
        )}
        {TAGS.map((t) => {
          const count = nonArchiviati.filter((n) => n.tag === t.value).length;
          if (count === 0) return null;
          return (
            <FiltroChip
              key={t.value}
              active={filtro === t.value}
              onClick={() => setFiltro(t.value)}
            >
              {t.icon} {t.label} ({count})
            </FiltroChip>
          );
        })}
      </div>

      <Button fullWidth className="mt-2" onClick={() => setCreating(true)}>
        <IconPlus size={18} /> Nuova nota
      </Button>

      {filtered.length === 0 ? (
        <EmptyState
          icon="📝"
          title={nonArchiviati.length === 0 ? "Nessuna nota ancora" : "Nessuna nota in questa categoria"}
          subtitle={
            nonArchiviati.length === 0
              ? "Appunta osservazioni, idee, promemoria... tutto resta qui."
              : undefined
          }
        />
      ) : (
        <>
          <div className="flex flex-col gap-2 mt-3">
            {visible.map((n) => (
              <NotaCard
                key={n.id}
                nota={n}
                onEdit={() => setEditing(n)}
                isArchiveView={filtro === "archiviate"}
              />
            ))}
          </div>
          {hasMore && <LoadMoreButton onClick={loadMore} remaining={remaining} />}
        </>
      )}

      {creating && (
        <NotaFormModal mode="create" onClose={() => setCreating(false)} />
      )}
      {editing && (
        <NotaFormModal mode="edit" initial={editing} onClose={() => setEditing(null)} />
      )}
    </>
  );
}

function FiltroChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-3 py-1.5 rounded-full whitespace-nowrap text-xs font-semibold border-2 cursor-pointer transition-all"
      style={{
        background: active ? "var(--primary)" : "white",
        color: active ? "white" : "var(--text-secondary)",
        borderColor: active ? "var(--primary)" : "var(--border)",
      }}
    >
      {children}
    </button>
  );
}

function NotaCard({
  nota,
  onEdit,
  isArchiveView,
}: {
  nota: NotaItem;
  onEdit: () => void;
  isArchiveView: boolean;
}) {
  const { show } = useToast();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  function onArchive() {
    startTransition(async () => {
      const res = await archiviaNota(nota.id, true);
      if (res.ok) show("Nota archiviata");
      else show(res.error ?? "Ops, riprova!");
    });
  }

  function onRestore() {
    startTransition(async () => {
      const res = await archiviaNota(nota.id, false);
      if (res.ok) show("Nota ripristinata");
      else show(res.error ?? "Ops, riprova!");
    });
  }

  function onDelete() {
    if (!window.confirm("Eliminare questa nota?")) return;
    startTransition(async () => {
      const res = await deleteNota(nota.id);
      if (res.ok) show("Nota eliminata");
      else show(res.error ?? "Ops, riprova!");
    });
  }

  const tag = TAGS.find((t) => t.value === nota.tag);
  return (
    <Card>
      <div className="flex justify-between items-start gap-2 mb-2">
        {tag ? (
          <Badge small bg={tag.bg} color={tag.color}>
            {tag.icon} {tag.label}
          </Badge>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-2">
          <span className="text-xs text-(--text-secondary)">
            {formatData(nota.data)}
          </span>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="text-xs text-(--text-secondary) underline-offset-2"
            aria-label="Apri azioni"
          >
            {open ? "✕" : "•••"}
          </button>
        </div>
      </div>
      <p className="text-sm text-text leading-relaxed whitespace-pre-wrap m-0">
        {nota.testo}
      </p>
      {nota.fotoUrl && (
        <div className="mt-3">
          <Avatar src={nota.fotoUrl} size={80} alt="Foto nota" />
        </div>
      )}
      {nota.promemoriaData && (
        <div
          className="mt-3 px-3 py-2 rounded-lg text-xs flex items-center gap-2"
          style={{
            background: nota.promemoriaInviato ? "#F0EDE8" : "#E8DAFF22",
            color: nota.promemoriaInviato ? "var(--text-secondary)" : "#7b5ea7",
          }}
        >
          {nota.promemoriaInviato ? "✓" : "🔔"} Promemoria:{" "}
          {formatDataLunga(nota.promemoriaData)} alle{" "}
          {new Date(nota.promemoriaData).toLocaleTimeString("it-IT", {
            hour: "2-digit",
            minute: "2-digit",
          })}
          {nota.promemoriaCanale && (
            <span className="ml-1">· {canaleLabel(nota.promemoriaCanale)}</span>
          )}
        </div>
      )}
      {open && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-(--border) mt-2">
          <Button
            variant="secondary"
            size="md"
            onClick={() => {
              setOpen(false);
              onEdit();
            }}
            disabled={pending}
            className="text-xs px-3 py-2"
          >
            ✏️ Modifica
          </Button>
          {isArchiveView ? (
            <Button
              variant="secondary"
              size="md"
              onClick={onRestore}
              disabled={pending}
              className="text-xs px-3 py-2"
            >
              ↩️ Ripristina
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="md"
              onClick={onArchive}
              disabled={pending}
              className="text-xs px-3 py-2"
            >
              🗄️ Archivia
            </Button>
          )}
          <button
            type="button"
            onClick={onDelete}
            disabled={pending}
            className="text-xs text-[#c0435a] font-semibold ml-auto"
          >
            Elimina
          </button>
        </div>
      )}
    </Card>
  );
}

function canaleLabel(c: CanaleNotifica): string {
  if (c === "push") return "📱 Push";
  if (c === "email") return "📧 Email";
  return "📱 + 📧";
}

function NotaFormModal({
  mode,
  initial,
  onClose,
}: {
  mode: "create" | "edit";
  initial?: NotaItem;
  onClose: () => void;
}) {
  const { show } = useToast();
  const [id] = useState(() => initial?.id ?? crypto.randomUUID());
  const [testo, setTesto] = useState(initial?.testo ?? "");
  const [tag, setTag] = useState<TagNota | "">(initial?.tag ?? "");
  const [foto, setFoto] = useState<File | null>(null);
  const [fotoUrl, setFotoUrl] = useState<string | null>(initial?.fotoUrl ?? null);
  const [usePromemoria, setUsePromemoria] = useState(!!initial?.promemoriaData);
  const [promemoriaDateTime, setPromemoriaDateTime] = useState(
    initial?.promemoriaData
      ? toLocalDateTimeInput(initial.promemoriaData)
      : defaultPromemoriaTime(),
  );
  const [canale, setCanale] = useState<CanaleNotifica>(
    initial?.promemoriaCanale ?? "push",
  );
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      try {
        let nextFotoUrl: string | null = fotoUrl;
        if (foto) {
          nextFotoUrl = await compressAndUpload(foto, `note/${id}/foto.jpg`);
        }
        const payload = {
          testo,
          tag: (tag || null) as TagNota | null,
          fotoUrl: nextFotoUrl,
          promemoriaData:
            usePromemoria && promemoriaDateTime
              ? new Date(promemoriaDateTime).toISOString()
              : null,
          promemoriaCanale: usePromemoria ? canale : null,
        };
        const res =
          mode === "create"
            ? await createNota({ id, ...payload })
            : await updateNota(initial!.id, payload);
        if (res.ok) {
          show(mode === "create" ? "✓ Nota salvata" : "✓ Modifiche salvate");
          onClose();
        } else {
          show(res.error ?? "Ops, riprova!");
        }
      } catch (e) {
        console.error(e);
        show("Ops, qualcosa non ha funzionato.");
      }
    });
  }

  return (
    <Modal
      title={mode === "create" ? "Nuova nota" : "Modifica nota"}
      onClose={onClose}
    >
      <form onSubmit={onSubmit}>
        <FormField label="Testo">
          <Textarea
            value={testo}
            onChange={(e) => setTesto(e.target.value)}
            rows={4}
            placeholder="Cosa vuoi appuntare?"
            required
            autoFocus
          />
        </FormField>

        <FormField label="Tag (opzionale)">
          <div className="flex gap-1.5 flex-wrap">
            {TAGS.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setTag(tag === t.value ? "" : t.value)}
                className="px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all"
                style={{
                  background: tag === t.value ? t.bg : "white",
                  borderColor: tag === t.value ? t.color : "var(--border)",
                  color: tag === t.value ? t.color : "var(--text-secondary)",
                }}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </FormField>

        <FormField label="Foto (opzionale)">
          <ImageUploadField
            existingUrl={fotoUrl}
            onChange={(f) => {
              setFoto(f);
              if (!f) setFotoUrl(null);
            }}
            size={120}
            label="Aggiungi foto"
          />
        </FormField>

        <div className="mt-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={usePromemoria}
              onChange={(e) => setUsePromemoria(e.target.checked)}
              className="w-5 h-5 accent-(--primary)"
            />
            <span className="text-sm font-semibold">
              🔔 Trasforma in promemoria
            </span>
          </label>
        </div>

        {usePromemoria && (
          <div className="mt-3 p-3 rounded-(--radius) bg-(--primary-lighter)">
            <FormField label="Quando ricordarti?">
              <Input
                type="datetime-local"
                value={promemoriaDateTime}
                onChange={(e) => setPromemoriaDateTime(e.target.value)}
                required={usePromemoria}
              />
            </FormField>
            <FormField label="Come avvisarti?">
              <Select
                value={canale}
                onChange={(e) => setCanale(e.target.value as CanaleNotifica)}
              >
                <option value="push">📱 Notifica push</option>
                <option value="email">📧 Email</option>
                <option value="entrambi">📱 + 📧 Entrambi</option>
              </Select>
            </FormField>
            <p className="text-[11px] text-(--text-secondary) italic m-0">
              {"Il promemoria verrà inviato all'orario scelto se i canali sono attivi nelle impostazioni."}
            </p>
          </div>
        )}

        <Button
          type="submit"
          fullWidth
          size="lg"
          disabled={!testo.trim() || pending}
          className="mt-4"
        >
          {pending
            ? "Salvataggio..."
            : mode === "create"
              ? "Salva nota"
              : "Salva modifiche"}
        </Button>
      </form>
    </Modal>
  );
}

function defaultPromemoriaTime(): string {
  // Domani alle 9:00 locali
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  // Convert to local datetime-local format
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function toLocalDateTimeInput(iso: string): string {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

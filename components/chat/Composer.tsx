"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { IconCamera, IconClose } from "@/components/ui/icons";
import { compressAndUpload } from "@/lib/utils/images";
import { useToast } from "@/components/ui/Toast";

export interface AllegatoLocale {
  type: "image";
  url: string;
}

interface Props {
  conversationId: string;
  userId: string;
  disabled?: boolean;
  onSend: (text: string, allegati: AllegatoLocale[]) => void;
}

const MAX_IMAGES = 4;

export function Composer({ conversationId, userId, disabled, onSend }: Props) {
  const [text, setText] = useState("");
  const [allegati, setAllegati] = useState<AllegatoLocale[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const { show } = useToast();

  function autoResize() {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 160) + "px";
  }

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (allegati.length >= MAX_IMAGES) {
      show(`Massimo ${MAX_IMAGES} immagini per messaggio.`);
      return;
    }
    setUploading(true);
    try {
      const stamp = Date.now();
      const rand = Math.random().toString(36).slice(2, 8);
      const path = `chat/${userId}/${conversationId}/${stamp}-${rand}.jpg`;
      const url = await compressAndUpload(file, path);
      setAllegati((cur) => [...cur, { type: "image", url }]);
    } catch (err) {
      console.error(err);
      show("Non riesco a caricare l'immagine. Riprova.");
    } finally {
      setUploading(false);
    }
  }

  function rimuoviAllegato(url: string) {
    setAllegati((cur) => cur.filter((a) => a.url !== url));
  }

  function invia() {
    const t = text.trim();
    if (!t && allegati.length === 0) return;
    onSend(t, allegati);
    setText("");
    setAllegati([]);
    if (taRef.current) taRef.current.style.height = "auto";
  }

  return (
    <div
      className="sticky bottom-0 z-10 bg-(--bg) border-t border-(--border) px-3 py-2"
      style={{ paddingBottom: "calc(8px + env(safe-area-inset-bottom, 0px))" }}
    >
      {allegati.length > 0 && (
        <div className="flex gap-2 mb-2 overflow-x-auto">
          {allegati.map((a) => (
            <div
              key={a.url}
              className="relative w-16 h-16 rounded-lg overflow-hidden border border-(--border) shrink-0"
            >
              <Image
                src={a.url}
                alt="Anteprima"
                fill
                sizes="64px"
                className="object-cover"
              />
              <button
                type="button"
                onClick={() => rimuoviAllegato(a.url)}
                className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center"
                aria-label="Rimuovi allegato"
              >
                <IconClose size={12} color="#fff" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={disabled || uploading || allegati.length >= MAX_IMAGES}
          aria-label="Allega immagine"
          className="w-10 h-10 rounded-full bg-(--surface-alt) flex items-center justify-center disabled:opacity-50 shrink-0"
        >
          <IconCamera size={20} />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onPickFile}
        />
        <textarea
          ref={taRef}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            autoResize();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              invia();
            }
          }}
          rows={1}
          placeholder={uploading ? "Carico l'immagine…" : "Scrivi all'assistente..."}
          disabled={disabled}
          className="flex-1 resize-none bg-white border border-(--border) rounded-2xl px-3.5 py-2.5 text-[15px] text-text outline-none focus:border-(--primary) disabled:opacity-50"
        />
        <Button
          type="button"
          onClick={invia}
          disabled={disabled || uploading || (!text.trim() && allegati.length === 0)}
          size="md"
          className="shrink-0"
        >
          Invia
        </Button>
      </div>
    </div>
  );
}

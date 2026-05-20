"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { IconCamera, IconClose } from "./icons";

interface ImageUploadFieldProps {
  /** URL pubblica esistente (es. foto già caricata) */
  existingUrl?: string | null;
  /** Callback al cambio del file selezionato (o rimosso) */
  onChange: (file: File | null) => void;
  /** Mostra il preview anche quando esiste existingUrl ma non c'è ancora file */
  showExistingAsPreview?: boolean;
  size?: number;
  label?: string;
}

export function ImageUploadField({
  existingUrl,
  onChange,
  showExistingAsPreview = true,
  size = 160,
  label = "Aggiungi foto",
}: ImageUploadFieldProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else if (showExistingAsPreview && existingUrl) {
      setPreview(existingUrl);
    } else {
      setPreview(null);
    }
  }, [file, existingUrl, showExistingAsPreview]);

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    onChange(f);
  }

  function handleRemove(e: React.MouseEvent) {
    e.preventDefault();
    setFile(null);
    setPreview(null);
    onChange(null);
  }

  return (
    <label
      className="rounded-3xl bg-[var(--primary-lighter)] flex items-center justify-center cursor-pointer overflow-hidden relative mx-auto"
      style={{
        width: size,
        height: size,
        border: preview ? "none" : "3px dashed var(--primary-light)",
      }}
    >
      {preview ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Anteprima" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-text/80 text-white flex items-center justify-center"
            aria-label="Rimuovi foto"
          >
            <IconClose size={16} color="#fff" />
          </button>
        </>
      ) : (
        <div className="text-center flex flex-col items-center">
          <IconCamera size={40} color="var(--primary)" />
          <div className="text-[13px] text-[var(--primary)] mt-2 font-semibold">{label}</div>
        </div>
      )}
      <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </label>
  );
}

import imageCompression from "browser-image-compression";
import { createClient } from "@/lib/supabase/client";

export const BUCKET = "poliner-media";

export async function compressImage(file: File): Promise<File> {
  const compressed = await imageCompression(file, {
    maxSizeMB: 0.5,
    maxWidthOrHeight: 1600,
    useWebWorker: true,
    fileType: "image/jpeg",
  });
  return new File([compressed], file.name.replace(/\.[^.]+$/, ".jpg"), {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}

/**
 * Upload di un file su Supabase Storage. Ritorna la URL pubblica (signed) del file.
 * `path` deve iniziare con uno dei prefissi consentiti dalla policy:
 *   pollai/, animali/, uova/, salute/, manutenzione/, note/
 */
export async function uploadToStorage(file: File, path: string): Promise<string> {
  const supabase = createClient();
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Comprime + carica un'immagine in un'unica chiamata. Ritorna l'URL pubblica.
 */
export async function compressAndUpload(file: File, path: string): Promise<string> {
  const compressed = await compressImage(file);
  return uploadToStorage(compressed, path);
}

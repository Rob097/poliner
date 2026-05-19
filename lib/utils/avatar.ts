const AVATAR_BG_PALETTE = [
  "#FFD6E0", // rosa
  "#FFE4D0", // pesca
  "#FFE07A", // burro
  "#B5D4B5", // salvia
  "#A8D1FF", // cielo
  "#E8DAFF", // lavanda
] as const;

/**
 * Hash deterministico (FNV-1a 32 bit). Lo usiamo per derivare un colore dal nome/id.
 */
function hash(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function avatarBgFor(seed: string): string {
  if (!seed) return AVATAR_BG_PALETTE[0];
  return AVATAR_BG_PALETTE[hash(seed) % AVATAR_BG_PALETTE.length];
}

export function defaultEmojiFor(tipo: "gallina" | "gallo"): string {
  return tipo === "gallo" ? "🐓" : "🐔";
}

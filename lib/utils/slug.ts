/**
 * Trasforma un nome in uno slug URL-safe per la pagina pubblica del pollaio.
 * Formato: lowercase, alfanumerico, dash. Max 40 chars.
 */
export function suggestSlug(nome: string): string {
  return nome
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export const SLUG_REGEX = /^[a-z0-9-]{3,40}$/;

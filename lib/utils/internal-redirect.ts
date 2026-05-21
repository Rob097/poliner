export function getSafeInternalRedirect(
  value: string | null | undefined,
  fallback = "/",
): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  try {
    const url = new URL(value, "http://localhost");
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
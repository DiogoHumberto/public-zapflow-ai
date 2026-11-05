/**
 * Restringe o parâmetro `next` dos links de autenticação a caminhos internos.
 * Evita open redirect (`//evil.com`, `https://evil.com`, `/\evil.com`).
 */
export function safeNextPath(
  value: string | null | undefined,
  fallback = "/dashboard"
): string {
  if (!value) return fallback;

  try {
    const url = new URL(value, "http://internal.local");
    if (url.origin !== "http://internal.local") return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

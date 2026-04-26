/**
 * Origin / IP helpers shared between login, change-password, and any other
 * security-sensitive Server Action.
 */

export type ReadOnlyHeaders = Pick<Headers, "get">;

/**
 * Returns true when the request's Origin (or Referer fallback) matches the
 * Host the page was served from. Same-origin checks are a CSRF tripwire that
 * complements (and never replaces) the explicit token check.
 *
 * Allow-list overrides via `AUTH_ALLOWED_ORIGINS` (comma separated) can be
 * useful when the app is reverse-proxied under multiple hostnames.
 */
export function verifySameOrigin(headerList: ReadOnlyHeaders): boolean {
  const host = headerList.get("host");
  if (!host) return false;

  const origin = headerList.get("origin");
  const referer = headerList.get("referer");

  const allowed = new Set<string>();
  // Trust the active host by default — if the request reached this server,
  // somebody in the chain (Next.js, the proxy) considered the host valid.
  allowed.add(`http://${host}`);
  allowed.add(`https://${host}`);

  for (const extra of (process.env.AUTH_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)) {
    allowed.add(extra);
  }

  if (origin) {
    return allowed.has(origin);
  }
  if (referer) {
    try {
      const url = new URL(referer);
      return allowed.has(`${url.protocol}//${url.host}`);
    } catch {
      return false;
    }
  }
  // Some browsers omit Origin/Referer for top-level form posts. Allow only
  // when explicitly opted in via env so the default stance stays strict.
  return process.env.AUTH_ALLOW_MISSING_ORIGIN === "1";
}

/**
 * Best-effort client IP extraction from common proxy headers, falling back to
 * the connection-level header. Result is trimmed to 64 chars for storage.
 */
export function extractClientIp(headerList: ReadOnlyHeaders): string | null {
  const candidates = [
    headerList.get("x-forwarded-for"),
    headerList.get("x-real-ip"),
    headerList.get("cf-connecting-ip"),
    headerList.get("true-client-ip"),
  ];
  for (const candidate of candidates) {
    if (!candidate) continue;
    const first = candidate.split(",")[0]?.trim();
    if (first) return first.slice(0, 64);
  }
  return null;
}

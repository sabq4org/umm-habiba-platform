/**
 * Cookie-anchored CSRF tokens for the login form.
 *
 * Strategy:
 *  - The middleware mints a random token and writes it to a
 *    `Lax + httpOnly: false` cookie on every visit to `/login`.
 *  - The `/login` server component reads that cookie and embeds the same value
 *    in a hidden field via `ensureCsrfToken()` (read-only — no `cookies().set`
 *    so it's safe inside server components in production).
 *  - On submit, the action verifies that both values match (a basic
 *    "double-submit" pattern) AND that the submitter's Origin matches the host.
 *
 * Server Actions in Next.js already include a same-origin check, so this is a
 * defense-in-depth layer that gives clear behaviour for users who arrive with
 * a stale page or with cookies disabled.
 */

import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const CSRF_COOKIE = "umh_csrf";

/**
 * Reads the CSRF token from the cookie set by middleware. If the cookie is
 * missing (e.g. middleware was bypassed), an empty string is returned and the
 * subsequent submit will simply be rejected by `verifyCsrfToken`.
 */
export async function ensureCsrfToken(): Promise<string> {
  const store = await cookies();
  const existing = store.get(CSRF_COOKIE)?.value;
  if (existing && /^[a-f0-9]{2,}$/.test(existing)) {
    return existing;
  }
  return "";
}

/**
 * Verifies that the submitted token matches the cookie token using a
 * constant-time comparison. Returns false if either is missing or malformed.
 */
export async function verifyCsrfToken(submitted: string): Promise<boolean> {
  if (!submitted || typeof submitted !== "string") return false;
  const store = await cookies();
  const cookieValue = store.get(CSRF_COOKIE)?.value ?? "";
  if (!cookieValue) return false;
  if (cookieValue.length !== submitted.length) return false;
  try {
    const a = Buffer.from(cookieValue);
    const b = Buffer.from(submitted);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

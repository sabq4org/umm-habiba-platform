import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "umh_session";
const CSRF_COOKIE = "umh_csrf";
const CSRF_TTL_SECONDS = 12 * 60 * 60;
const PUBLIC_PATHS = ["/login", "/inquiry", "/api/healthz"];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

/** Edge-safe random hex via Web Crypto (no `node:crypto` dependency). */
function newCsrfToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const byte of bytes) out += byte.toString(16).padStart(2, "0");
  return out;
}

/**
 * Ensures a CSRF cookie exists. Mutates `request.cookies` so the very first
 * render also sees the value (Next.js propagates `request` overrides into
 * downstream server components via `NextResponse.next({ request })`).
 */
function ensureCsrfCookie(request: NextRequest): {
  response: NextResponse;
  request: NextRequest;
} {
  const existing = request.cookies.get(CSRF_COOKIE)?.value;
  if (existing && /^[a-f0-9]{2,}$/.test(existing)) {
    return { response: NextResponse.next(), request };
  }
  const token = newCsrfToken();
  request.cookies.set(CSRF_COOKIE, token);
  const response = NextResponse.next({ request });
  response.cookies.set(CSRF_COOKIE, token, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: CSRF_TTL_SECONDS,
  });
  return { response, request };
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublic(pathname)) {
    // Mint a CSRF cookie on the login page so the server component just reads it.
    // Doing it here avoids the "cannot set cookie from a server component" error.
    if (pathname === "/login") {
      return ensureCsrfCookie(request).response;
    }
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;

  // Lightweight presence check only. Full HMAC verification happens server-side
  // in `getCurrentSession` / `requireUser` which are called by every page in
  // the (app) route group through the AppShell.
  if (!token) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", pathname);
    const redirect = NextResponse.redirect(url);
    // Pre-mint the CSRF cookie before the user lands on /login so the form is
    // ready to submit immediately.
    const csrfExisting = request.cookies.get(CSRF_COOKIE)?.value;
    if (!csrfExisting || !/^[a-f0-9]{2,}$/.test(csrfExisting)) {
      redirect.cookies.set(CSRF_COOKIE, newCsrfToken(), {
        httpOnly: false,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        maxAge: CSRF_TTL_SECONDS,
      });
    }
    return redirect;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Run on all paths except next static, favicon, robots, images, api/health.
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|public).*)",
  ],
};

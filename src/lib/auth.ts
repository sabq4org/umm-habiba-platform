import {
  createHmac,
  randomBytes,
  scrypt,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import type { Role } from "./roles";
import { isRole } from "./roles";
import {
  bumpUserFailure,
  checkLoginRate,
  pruneOldAttempts,
  recordLoginAttempt,
  resetUserFailure,
  type LoginAttemptContext,
} from "./loginGuard";
import { LOGIN_POLICY } from "./passwordPolicy";

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: string,
  keylen: number,
) => Promise<Buffer>;

export const SESSION_COOKIE = "umh_session";
const SESSION_DURATION_DAYS = 7;

function getSecret(): string {
  return (
    process.env.AUTH_SECRET ||
    "umm-habiba-development-secret-please-set-AUTH_SECRET"
  );
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = await scryptAsync(password, salt, 64);
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  if (!stored) return false;
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const [, salt, hex] = parts;
  try {
    const expected = Buffer.from(hex, "hex");
    const actual = await scryptAsync(password, salt, expected.length);
    return (
      expected.length === actual.length && timingSafeEqual(expected, actual)
    );
  } catch {
    return false;
  }
}

function base64UrlEncode(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/=+$/, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(str: string): Buffer {
  const padded = str
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(str.length / 4) * 4, "=");
  return Buffer.from(padded, "base64");
}

function sign(payload: string): string {
  return base64UrlEncode(
    createHmac("sha256", getSecret()).update(payload).digest(),
  );
}

export type SessionData = {
  userId: string;
  username: string;
  fullName: string;
  role: Role;
  expiresAt: number;
  mustChangePassword?: boolean;
};

export function createSessionToken(
  data: Omit<SessionData, "expiresAt">,
): { token: string; expiresAt: Date } {
  const expiresAt = new Date(
    Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000,
  );
  const payload: SessionData = { ...data, expiresAt: expiresAt.getTime() };
  const body = base64UrlEncode(Buffer.from(JSON.stringify(payload), "utf8"));
  const sig = sign(body);
  return { token: `${body}.${sig}`, expiresAt };
}

export function verifySessionToken(token: string | undefined): SessionData | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  if (sign(body) !== sig) return null;
  try {
    const json = base64UrlDecode(body).toString("utf8");
    const data = JSON.parse(json) as SessionData;
    if (typeof data.expiresAt !== "number" || data.expiresAt < Date.now()) {
      return null;
    }
    if (!isRole(data.role)) return null;
    return data;
  } catch {
    return null;
  }
}

export async function getCurrentSession(): Promise<SessionData | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  return verifySessionToken(token);
}

export async function requireUser(): Promise<SessionData> {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}

/**
 * Same as `requireUser`, but re-hydrates `fullName`, `role`, and
 * `mustChangePassword` from the database so admin renames or role changes
 * take effect on the very next request without requiring a re-login.
 */
export async function requireFreshUser(): Promise<SessionData> {
  const session = await requireUser();
  const [row] = await db
    .select({
      fullName: schema.users.fullName,
      role: schema.users.role,
      status: schema.users.status,
      mustChangePassword: schema.users.mustChangePassword,
    })
    .from(schema.users)
    .where(eq(schema.users.id, session.userId))
    .limit(1);
  if (!row) {
    redirect("/login");
  }
  if (row.status !== "active") {
    redirect("/login");
  }
  return {
    ...session,
    fullName: row.fullName,
    role: isRole(row.role) ? row.role : session.role,
    mustChangePassword: row.mustChangePassword,
  };
}

export async function setSessionCookie(
  data: Omit<SessionData, "expiresAt">,
): Promise<void> {
  const { token, expiresAt } = createSessionToken(data);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export type AuthenticateResult =
  | { ok: true; session: Omit<SessionData, "expiresAt"> }
  | { ok: false; error: string; lockedUntil?: Date };

export async function authenticate(
  username: string,
  password: string,
  ctx: LoginAttemptContext = { ip: null, userAgent: null },
): Promise<AuthenticateResult> {
  const cleanUsername = (username ?? "").trim().toLowerCase();
  if (!cleanUsername || !password) {
    return { ok: false, error: "اسم المستخدم وكلمة المرور مطلوبان" };
  }

  const rate = await checkLoginRate(cleanUsername, ctx);
  if (rate.blocked) {
    const minutes = Math.max(1, Math.ceil(rate.retryAfterSeconds / 60));
    return {
      ok: false,
      error: `محاولات تسجيل الدخول كثيرة، حاولي بعد ${minutes} دقيقة`,
    };
  }

  const [user] = await db
    .select({
      id: schema.users.id,
      username: schema.users.username,
      fullName: schema.users.fullName,
      role: schema.users.role,
      passwordHash: schema.users.passwordHash,
      status: schema.users.status,
      mustChangePassword: schema.users.mustChangePassword,
      failedLoginAttempts: schema.users.failedLoginAttempts,
      lockedUntil: schema.users.lockedUntil,
    })
    .from(schema.users)
    .where(eq(schema.users.username, cleanUsername))
    .limit(1);

  // Always record an attempt so the rate-limit window reflects unknown users too.
  if (!user) {
    await recordLoginAttempt(cleanUsername, false, ctx);
    return { ok: false, error: "بيانات الدخول غير صحيحة" };
  }
  if (user.status !== "active") {
    await recordLoginAttempt(cleanUsername, false, ctx);
    return { ok: false, error: "هذا الحساب موقوف، يرجى التواصل مع الإدارة" };
  }
  if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
    const minutes = Math.max(
      1,
      Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000),
    );
    await recordLoginAttempt(cleanUsername, false, ctx);
    return {
      ok: false,
      error: `الحساب مقفل مؤقتاً بعد عدّة محاولات، حاولي بعد ${minutes} دقيقة`,
      lockedUntil: user.lockedUntil,
    };
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    await recordLoginAttempt(cleanUsername, false, ctx);
    const lockState = await bumpUserFailure(user.id, user.failedLoginAttempts);
    if (lockState.locked) {
      return {
        ok: false,
        error: `تم قفل الحساب بعد ${LOGIN_POLICY.lockThreshold} محاولات خاطئة. حاولي بعد ${LOGIN_POLICY.lockMinutes} دقيقة`,
        lockedUntil: lockState.lockedUntil ?? undefined,
      };
    }
    return { ok: false, error: "بيانات الدخول غير صحيحة" };
  }
  if (!isRole(user.role)) {
    return { ok: false, error: "صلاحية الحساب غير مدعومة" };
  }

  await Promise.all([
    recordLoginAttempt(cleanUsername, true, ctx),
    resetUserFailure(user.id, ctx.ip),
  ]);
  // Fire-and-forget cleanup; never block login on this.
  pruneOldAttempts().catch(() => {});

  return {
    ok: true,
    session: {
      userId: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    },
  };
}

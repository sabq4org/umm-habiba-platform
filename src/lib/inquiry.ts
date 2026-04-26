/**
 * Helpers for the public student inquiry flow (`/inquiry`).
 *
 * The inquiry feature lets a student fetch her own profile + grades + attendance
 * without holding a platform account. Verification is two-piece (national ID +
 * date of birth) and rate-limited at the IP level so it cannot be brute-forced.
 *
 * After a successful match we mint a short-lived signed cookie that just carries
 * the resolved student id; subsequent requests to `/inquiry/profile` re-read it
 * and rehydrate the data from the database, so we never trust client-held PII.
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { and, eq, gte, sql } from "drizzle-orm";
import { db, schema } from "@/db";

export const INQUIRY_COOKIE = "umh_inquiry";
const INQUIRY_TTL_MINUTES = 30;

const RATE_WINDOW_MINUTES = 15;
const RATE_MAX_FAILURES = 6;

function getSecret(): string {
  return (
    process.env.AUTH_SECRET ||
    "umm-habiba-development-secret-please-set-AUTH_SECRET"
  );
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

type InquiryToken = {
  studentId: string;
  expiresAt: number;
};

export function createInquiryToken(studentId: string): {
  token: string;
  expiresAt: Date;
} {
  const expiresAt = new Date(Date.now() + INQUIRY_TTL_MINUTES * 60 * 1000);
  const payload: InquiryToken = {
    studentId,
    expiresAt: expiresAt.getTime(),
  };
  const body = base64UrlEncode(Buffer.from(JSON.stringify(payload), "utf8"));
  const signature = sign(body);
  return { token: `${body}.${signature}`, expiresAt };
}

export function verifyInquiryToken(token: string | undefined): string | null {
  if (!token) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  const expected = Buffer.from(sign(body));
  const provided = Buffer.from(signature);
  if (
    expected.length !== provided.length ||
    !timingSafeEqual(expected, provided)
  ) {
    return null;
  }
  try {
    const payload = JSON.parse(
      base64UrlDecode(body).toString("utf8"),
    ) as InquiryToken;
    if (typeof payload.studentId !== "string") return null;
    if (typeof payload.expiresAt !== "number") return null;
    if (payload.expiresAt < Date.now()) return null;
    return payload.studentId;
  } catch {
    return null;
  }
}

export async function setInquiryCookie(studentId: string): Promise<void> {
  const { token, expiresAt } = createInquiryToken(studentId);
  const store = await cookies();
  store.set(INQUIRY_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/inquiry",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
  });
}

export async function clearInquiryCookie(): Promise<void> {
  const store = await cookies();
  store.delete(INQUIRY_COOKIE);
}

export async function getInquiryStudentId(): Promise<string | null> {
  const store = await cookies();
  return verifyInquiryToken(store.get(INQUIRY_COOKIE)?.value);
}

/* ---------- Rate-limit (per-IP, reuses login_attempts table) ---------- */

function bucketKey(ip: string | null): string {
  const safeIp = (ip ?? "unknown").slice(0, 60);
  return `inquiry::${safeIp}`;
}

export type InquiryRateState = {
  blocked: boolean;
  retryAfterSeconds: number;
};

export async function checkInquiryRate(
  ip: string | null,
): Promise<InquiryRateState> {
  const bucket = bucketKey(ip);
  const since = new Date(Date.now() - RATE_WINDOW_MINUTES * 60 * 1000);
  const rows = await db
    .select({
      occurredAt: schema.loginAttempts.occurredAt,
      success: schema.loginAttempts.success,
    })
    .from(schema.loginAttempts)
    .where(
      and(
        eq(schema.loginAttempts.bucket, bucket),
        gte(schema.loginAttempts.occurredAt, since),
      ),
    );

  const failures = rows.filter((r) => !r.success);
  if (failures.length < RATE_MAX_FAILURES) {
    return { blocked: false, retryAfterSeconds: 0 };
  }
  const oldest = failures.reduce((acc, row) => {
    return acc.getTime() < row.occurredAt.getTime() ? acc : row.occurredAt;
  }, failures[0].occurredAt);
  const unlocksAt = oldest.getTime() + RATE_WINDOW_MINUTES * 60 * 1000;
  return {
    blocked: true,
    retryAfterSeconds: Math.max(1, Math.ceil((unlocksAt - Date.now()) / 1000)),
  };
}

export async function recordInquiryAttempt(
  ip: string | null,
  success: boolean,
  userAgent: string | null,
  nationalId: string | null,
): Promise<void> {
  await db.insert(schema.loginAttempts).values({
    bucket: bucketKey(ip),
    success,
    username: nationalId
      ? `inq:${nationalId}`.slice(0, 60)
      : "inq:unknown",
    ip: ip ?? null,
    userAgent: userAgent?.slice(0, 200) ?? null,
  });
}

export async function pruneOldInquiryAttempts(): Promise<void> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  await db
    .delete(schema.loginAttempts)
    .where(sql`${schema.loginAttempts.occurredAt} < ${cutoff}`);
}

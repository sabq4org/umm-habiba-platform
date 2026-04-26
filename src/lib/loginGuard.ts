/**
 * Login rate-limiting & lockout helpers.
 *
 * Two protections work together:
 *
 * 1. Per-account lockout (DB-backed) — when a user fails too many times in a
 *    row, their `users.locked_until` is set. Survives restarts and is the
 *    source of truth for "this account is temporarily locked".
 *
 * 2. Rolling IP+username rate limit (DB-backed via `login_attempts`) — counts
 *    recent failures so a single IP cannot keep guessing across many usernames
 *    or recover from a lockout by switching credentials.
 */

import { and, eq, gte, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { LOGIN_POLICY } from "./passwordPolicy";

export type LoginAttemptContext = {
  ip: string | null;
  userAgent: string | null;
};

export type RateLimitState = {
  blocked: boolean;
  retryAfterSeconds: number;
  remainingFailures: number;
};

function bucketKey(ip: string | null, username: string): string {
  const safeIp = (ip ?? "unknown").slice(0, 60);
  return `${safeIp}::${username.toLowerCase()}`;
}

function windowStart(): Date {
  return new Date(Date.now() - LOGIN_POLICY.rateWindowMinutes * 60 * 1000);
}

/**
 * Inspects how many failed attempts the bucket has within the rolling window
 * and returns whether the caller should be blocked from trying again.
 */
export async function checkLoginRate(
  username: string,
  ctx: LoginAttemptContext,
): Promise<RateLimitState> {
  const bucket = bucketKey(ctx.ip, username);
  const since = windowStart();
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
  const remainingFailures = Math.max(
    0,
    LOGIN_POLICY.rateMaxFailures - failures.length,
  );
  if (failures.length < LOGIN_POLICY.rateMaxFailures) {
    return { blocked: false, retryAfterSeconds: 0, remainingFailures };
  }
  const oldest = failures.reduce((acc, row) => {
    return acc.getTime() < row.occurredAt.getTime() ? acc : row.occurredAt;
  }, failures[0].occurredAt);
  const unlocksAt =
    oldest.getTime() + LOGIN_POLICY.rateWindowMinutes * 60 * 1000;
  return {
    blocked: true,
    retryAfterSeconds: Math.max(1, Math.ceil((unlocksAt - Date.now()) / 1000)),
    remainingFailures: 0,
  };
}

/** Persists a login attempt for auditing and rate-limit accounting. */
export async function recordLoginAttempt(
  username: string,
  success: boolean,
  ctx: LoginAttemptContext,
): Promise<void> {
  await db.insert(schema.loginAttempts).values({
    bucket: bucketKey(ctx.ip, username),
    success,
    username: username.slice(0, 60).toLowerCase(),
    ip: ctx.ip ?? null,
    userAgent: ctx.userAgent?.slice(0, 200) ?? null,
  });
}

/**
 * Increments the per-user failure counter and locks the account once the
 * configured threshold is reached. Returns the resulting lock state so the
 * caller can surface a helpful message.
 */
export async function bumpUserFailure(
  userId: string,
  currentFailures: number,
): Promise<{ locked: boolean; lockedUntil: Date | null }> {
  const next = currentFailures + 1;
  const shouldLock = next >= LOGIN_POLICY.lockThreshold;
  const lockedUntil = shouldLock
    ? new Date(Date.now() + LOGIN_POLICY.lockMinutes * 60 * 1000)
    : null;

  await db
    .update(schema.users)
    .set({
      failedLoginAttempts: next,
      lockedUntil: shouldLock ? lockedUntil : null,
      updatedAt: new Date(),
    })
    .where(eq(schema.users.id, userId));

  return { locked: shouldLock, lockedUntil };
}

/** Clears the lockout state after a successful authentication. */
export async function resetUserFailure(
  userId: string,
  ip: string | null,
): Promise<void> {
  await db
    .update(schema.users)
    .set({
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
      lastLoginIp: ip ? ip.slice(0, 60) : null,
      updatedAt: new Date(),
    })
    .where(eq(schema.users.id, userId));
}

/**
 * Best-effort cleanup helper. Drops attempt rows older than 24h so the table
 * doesn't grow unbounded. Called opportunistically from the login flow.
 */
export async function pruneOldAttempts(): Promise<void> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  await db
    .delete(schema.loginAttempts)
    .where(sql`${schema.loginAttempts.occurredAt} < ${cutoff}`);
}

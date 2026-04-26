import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { setDefaultResultOrder } from "node:dns";
import * as schema from "./schema";

type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;

let cached: DrizzleDb | null = null;
let dnsConfigured = false;

/**
 * Force DNS lookups to prefer IPv4. Some PaaS networks (e.g. DigitalOcean App
 * Platform) cannot reach the IPv6 address Neon's AWS endpoint advertises and
 * the Neon serverless driver hangs with `ETIMEDOUT`. IPv4 to the same host
 * works in <1s. Setting this once per process is cheap and idempotent. As an
 * alternative, set `NODE_OPTIONS="--dns-result-order=ipv4first"` in the
 * platform env so it takes effect before any user code runs.
 */
function ensureIpv4First(): void {
  if (dnsConfigured) return;
  try {
    setDefaultResultOrder("ipv4first");
    dnsConfigured = true;
  } catch {
    // The Edge runtime doesn't expose `dns/promises`; silently skip there.
    dnsConfigured = true;
  }
}

function getDb(): DrizzleDb {
  if (cached) return cached;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Add it to .env.local (locally) or as a SECRET env in your hosting dashboard.",
    );
  }
  ensureIpv4First();
  const sql = neon(url);
  cached = drizzle(sql, { schema });
  return cached;
}

/**
 * Lazy proxy: importing `db` is free (no DB connection, no env read). The
 * connection is only opened when the first method (e.g. `db.select(...)`) is
 * called. This lets the build run without DATABASE_URL and lets the /healthz
 * endpoint respond without touching Postgres.
 */
export const db = new Proxy({} as DrizzleDb, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver);
  },
});

export { schema };

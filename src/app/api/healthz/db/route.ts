import { NextResponse } from "next/server";
import { sql, eq } from "drizzle-orm";
import { db, schema } from "@/db";

/**
 * Diagnostic-only endpoint that probes whether the runtime can reach Postgres
 * and whether the core tables seeded by `npm run db:seed` exist. It is gated
 * behind `?key=` matching `AUTH_SECRET` (or `HEALTHZ_KEY` if you'd rather use
 * a separate value) so it cannot be scraped by anonymous traffic.
 *
 *   curl -s "https://<host>/api/healthz/db?key=<AUTH_SECRET>"
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const provided = url.searchParams.get("key") ?? "";
  const expected = process.env.HEALTHZ_KEY || process.env.AUTH_SECRET || "";
  if (!expected || provided !== expected) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const env = {
    has_DATABASE_URL: Boolean(process.env.DATABASE_URL),
    has_AUTH_SECRET: Boolean(process.env.AUTH_SECRET),
    NODE_ENV: process.env.NODE_ENV ?? null,
  };

  try {
    const pingRaw = (await db.execute(sql`select 1 as ok`)) as unknown;
    const ping = Array.isArray(pingRaw)
      ? pingRaw
      : ((pingRaw as { rows?: unknown }).rows ?? pingRaw);

    const tablesRaw = (await db.execute(
      sql`select table_name from information_schema.tables where table_schema = 'public' order by table_name`,
    )) as unknown;
    const tableRows = (Array.isArray(tablesRaw)
      ? tablesRaw
      : ((tablesRaw as { rows?: unknown[] }).rows ?? [])) as Array<{
      table_name: string;
    }>;

    const adminRows = await db
      .select({ id: schema.users.id, fullName: schema.users.fullName })
      .from(schema.users)
      .where(eq(schema.users.username, "admin"))
      .limit(1);

    return NextResponse.json({
      ok: true,
      env,
      ping,
      tables: tableRows.map((r) => r.table_name),
      adminPresent: adminRows.length > 0,
      adminFullName: adminRows[0]?.fullName ?? null,
      time: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        env,
        error: err instanceof Error ? err.message : String(err),
        cause:
          err instanceof Error && err.cause instanceof Error
            ? err.cause.message
            : undefined,
      },
      { status: 500 },
    );
  }
}

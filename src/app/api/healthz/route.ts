import { NextResponse } from "next/server";

/**
 * Lightweight health check for the platform's load balancer.
 * Does NOT touch the database; it only reports that the Node process and
 * Next.js runtime are alive. The database is verified separately by
 * `/api/healthz/db` below.
 */
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    ok: true,
    service: "umm-habiba-platform",
    time: new Date().toISOString(),
  });
}

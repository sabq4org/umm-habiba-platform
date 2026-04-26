import { NextResponse } from "next/server";
import { exportSnapshot, snapshotFileName } from "@/lib/backup";
import { getCurrentSession } from "@/lib/auth";
import { can } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  if (!can(session.role, "backup.read")) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const snapshot = await exportSnapshot();
  const body = JSON.stringify(snapshot, null, 2);
  const fileName = snapshotFileName();

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
